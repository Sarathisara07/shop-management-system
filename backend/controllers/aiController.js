const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const CashEntry = require("../models/CashEntry");
const mongoose = require("mongoose");

// Initialize Gemini
exports.chatWithAssistant = async (req, res) => {
  try {
    const { message } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      const errMsg = "ஏபிஐ கீ (API Key) இல்லை. தயவுசெய்து செக் செய்யவும்.";
      return res.status(400).json({ response: errMsg, audio: await generateTTSAudio(errMsg) });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const products = await Product.find({ user: req.shopOwnerId });
    const productList = products.map(p => `${p.name} (Price: ${p.defaultRate}/kg, ID: ${p._id})`).join(", ");

    // 2. Define tools for Gemini
    const tools = [
      {
        functionDeclarations: [
          {
            name: "add_transaction_entry",
            description: "Adds a new scrap transaction entry when the user wants to record a sell/purchase of material.",
            parameters: {
              type: "OBJECT",
              properties: {
                product_name: { type: "STRING", description: "The name of the material (e.g., Iron, Copper, Plastic)" },
                weight: { type: "NUMBER", description: "The weight in kg" },
                rate: { type: "NUMBER", description: "Optional. The custom rate per kg. If not provided, it uses the default rate." }
              },
              required: ["product_name", "weight"]
            }
          },
          {
            name: "get_today_summary",
            description: "Gets the total profit, total spent, and cash summary for today.",
            parameters: { type: "OBJECT", properties: {} }
          }
        ]
      }
    ];

    // Try multiple models as fallback
    const modelNames = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
    const sysInstruction = {
      role: "system",
      parts: [{ text: `You are a helpful Scrap Shop Assistant for a shop owner in Tamil Nadu. 
    Available materials in this shop: ${productList}.
    CRITICAL AND MANDATORY INSTRUCTION: You MUST reply ONLY in TAMIL SCRIPT (தமிழ்). Even if the user types their message in ENGLISH, or Romanized/Tanglish, you MUST translate your thoughts and provide the final text response strictly in pure Tamil font/script. NEVER return English words.
    If the user asks to add something, use the add_transaction_entry tool. 
    Always confirm the action in a friendly way in TAMIL.
    If the user asks for a summary or profit, use the get_today_summary tool.` }]
    };

    let result;
    let lastError;

    for (const modelName of modelNames) {
      try {
        console.log("Trying model:", modelName);
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: sysInstruction
        });
        const chat = model.startChat({ tools: tools });
        result = await chat.sendMessage(message);
        console.log("Success with model:", modelName);
        break; // Success!
      } catch (err) {
        console.log(`Model ${modelName} failed (${err.status}). Trying next...`);
        lastError = err;
        if (err.status === 429) {
          // Quota exceeded - wait a bit before trying next model
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        continue;
      }
    }

    if (!result) {
      throw lastError; // All models failed
    }
    
    const response = result.response;
    
    if (!response || !response.candidates || response.candidates.length === 0) {
      console.error("No candidates returned from Gemini:", response);
      const errMsg = "மன்னிக்கவும், கூகுள் ஏஐ பதில் தரவில்லை.";
      return res.json({ response: errMsg, audio: await generateTTSAudio(errMsg) });
    }

    const content = response.candidates[0].content;
    const call = content.parts && content.parts.find(p => p.functionCall);

    if (call) {
      const { name, args } = call.functionCall;
      console.log("AI calling tool:", name, args);
      
      if (name === "add_transaction_entry") {
        if (!args.product_name) {
          const errMsg = "நீங்க என்ன மெட்டீரியல்னு சொல்லல, திரும்பவும் சொல்ல முடியுமா?";
          return res.json({ response: errMsg, audio: await generateTTSAudio(errMsg) });
        }

        // Handle Transaction Creation
        const matchedProduct = products.find(p => 
          p.name.toLowerCase().includes(args.product_name.toLowerCase()) || 
          args.product_name.toLowerCase().includes(p.name.toLowerCase())
        );

        if (!matchedProduct) {
          const errMsg = `மன்னிக்கவும், "${args.product_name}" என்ற மெட்டீரியல் என்னிடம் இல்லை. என்னிடம் இருப்பவை: ${products.map(p => p.name).join(", ")}.`;
          return res.json({ response: errMsg, audio: await generateTTSAudio(errMsg) });
        }

        const rate = args.rate || matchedProduct.defaultRate;
        const weight = args.weight || 0;
        const totalAmount = rate * weight;
        
        const buyingRate = rate;
        const sellingRate = matchedProduct.wholesaleRate || buyingRate;
        const profitPerKg = sellingRate - buyingRate;
        const calculatedProfit = profitPerKg * weight;

        const newTx = new Transaction({
          customerName: "AI Assistant Entry",
          items: [{
            product: matchedProduct._id,
            productName: matchedProduct.name,
            weight: weight,
            rate: rate,
            amount: totalAmount,
            buyingRate,
            sellingRate,
            calculatedProfit
          }],
          totalWeight: weight,
          totalAmount: totalAmount,
          user: req.shopOwnerId
        });

        await newTx.save();
        const ttsText = `சரிங்க, ${weight} கிலோ ${matchedProduct.name} (விலை ₹${rate}/kg) கணக்கில் சேர்த்தாச்சு!`;
        return res.json({ 
          response: ttsText,
          audio: await generateTTSAudio(ttsText),
          action: "entry_added",
          data: args
        });
      }

      if (name === "get_today_summary") {
        const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);
        
        const txs = await Transaction.find({ user: req.shopOwnerId, date: { $gte: startOfDay, $lte: endOfDay } });
        const totalSpent = txs.reduce((sum, t) => sum + t.totalAmount, 0);
        const totalProfit = txs.reduce((sum, t) => sum + t.items.reduce((s, i) => s + (i.calculatedProfit || 0), 0), 0);
        
        const ttsText = `இன்றைய நிலவரம்: மொத்தம் ${txs.length} என்ட்ரிகள். செலவு: ₹${totalSpent}. லாபம்: ₹${totalProfit}.`;
        return res.json({ 
          response: ttsText,
          audio: await generateTTSAudio(ttsText),
          data: { totalSpent, totalProfit, count: txs.length }
        });
      }
    }

    // Default text response
    const aiText = response.text() || "மன்னிக்கவும், எனக்குப் புரியவில்லை.";
    res.json({ response: aiText, audio: await generateTTSAudio(aiText) });

  } catch (error) {
    console.error("AI Chat Full Error:", error);
    if (error.status === 429) {
      const errMsg = "இன்றைய இலவச பயன்பாட்டு வரம்பு (Daily Limit) முடிந்துவிட்டது. தயவுசெய்து சிறிது நேரம் கழித்து அல்லது நாளை மீண்டும் முயற்சிக்கவும்.";
      return res.status(429).json({ response: errMsg, audio: await generateTTSAudio(errMsg) });
    }
    const errMsg = "ஏஐ அசிஸ்டெண்ட் இப்போது வேலையில் இருக்கிறாள். பிறகு முயற்சிக்கவும்.";
    res.status(500).json({ response: errMsg, audio: await generateTTSAudio(errMsg) });
  }
};

// Helper fetch to get guaranteed Tamil Audio
const generateTTSAudio = async (text) => {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ta&client=tw-ob&q=${encodeURIComponent(text)}`;
    const fRes = await fetch(url);
    if (!fRes.ok) return null;
    const arrayBuffer = await fRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    return `data:audio/mp3;base64,${base64Audio}`;
  } catch(e) {
    console.error("TTS fetch failed", e);
    return null;
  }
}
