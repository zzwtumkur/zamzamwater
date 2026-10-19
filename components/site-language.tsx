"use client";

import { useEffect } from "react";

type Language = "en" | "hi" | "kn";

const translations: Record<Exclude<Language, "en">, Record<string, string>> = {
  hi: {
    "FRESH WATER · TUMKUR": "ताज़ा पानी · तुमकुर", "Pure Water,": "शुद्ध पानी,", "for every sip.": "हर घूंट के लिए।",
    "Fresh, mineral-rich drinking water from Zam Zam Water, delivered to your home, office, or event with a cleaner, faster, more reliable experience.": "ज़म ज़म वॉटर का ताज़ा, खनिज-युक्त पेयजल—आपके घर, कार्यालय या कार्यक्रम तक स्वच्छ, तेज़ और भरोसेमंद डिलीवरी।",
    "Track an order →": "ऑर्डर ट्रैक करें →", "✓ Easy ordering": "✓ आसान ऑर्डर", "✓ Flexible delivery": "✓ सुविधाजनक डिलीवरी", "✓ Pay on delivery": "✓ डिलीवरी पर भुगतान",
    "AVAILABLE DAILY": "हर दिन उपलब्ध", "Fresh. Clean. Trusted.": "ताज़ा। स्वच्छ। भरोसेमंद।", "Same-day delivery": "उसी दिन डिलीवरी", "Bottles ready": "बोतलें तैयार", "Customer rating": "ग्राहक रेटिंग",
    "Choose your water": "अपना पानी चुनें", "Select refills or new bottles in the size that fits your home and routine.": "अपने घर और जरूरत के अनुसार रिफिल या नई बोतल का आकार चुनें।",
    "Pick a delivery slot": "डिलीवरी स्लॉट चुनें", "Reserve a convenient time window that matches your schedule and location.": "अपने समय और स्थान के अनुसार सुविधाजनक स्लॉट चुनें।",
    "Track every step": "हर चरण ट्रैक करें", "Follow your order in real time and stay informed from dispatch to delivery.": "डिस्पैच से डिलीवरी तक अपने ऑर्डर की लाइव जानकारी पाएँ।",
    "Order fresh water in Tumkur": "तुमकुर में ताज़ा पानी ऑर्डर करें",
    "Pure water, delivered with care.": "शुद्ध पानी, सावधानी से आपके घर तक।",
    "Order Now": "अभी ऑर्डर करें", "Track Order": "ऑर्डर ट्रैक करें", Admin: "एडमिन",
    "Start with your mobile number": "अपने मोबाइल नंबर से शुरू करें",
    "We’ll find your saved details, or help you enter them if you’re new.": "हम आपकी सहेजी गई जानकारी खोजेंगे या नई जानकारी भरने में मदद करेंगे।",
    "10-digit Mobile Number": "10 अंकों का मोबाइल नंबर", "Enter mobile number": "मोबाइल नंबर दर्ज करें",
    Continue: "आगे बढ़ें", "Checking...": "जाँच हो रही है...", "Check Delivery Pincode": "डिलीवरी पिनकोड जाँचें",
    "Confirm service availability before entering your order.": "ऑर्डर भरने से पहले सेवा उपलब्धता की पुष्टि करें।",
    "View full order history →": "पूरा ऑर्डर इतिहास देखें →", "6-digit Pincode": "6 अंकों का पिनकोड",
    "Check Availability": "उपलब्धता जाँचें", "📍 Detect Pincode From My Location": "📍 मेरे स्थान से पिनकोड पता करें",
    "Continue to details": "विवरण पर जाएँ", Back: "पीछे", "Your Details": "आपका विवरण",
    "Full Name *": "पूरा नाम *", "Full Delivery Address *": "पूरा डिलीवरी पता *", "Landmark (optional)": "लैंडमार्क (वैकल्पिक)",
    "Continue to delivery": "डिलीवरी पर जाएँ", "Select Delivery Time": "डिलीवरी समय चुनें",
    "Delivery Date *": "डिलीवरी तारीख *", "Preferred Time Slot *": "पसंदीदा समय स्लॉट *",
    "Choose a date first": "पहले तारीख चुनें", "Choose available time": "उपलब्ध समय चुनें",
    "Times are shown in IST. Every upcoming 15-minute slot is available across the full day and night.": "समय IST में है। दिन और रात के सभी आने वाले 15 मिनट के स्लॉट उपलब्ध हैं।",
    "Continue to bottle type": "बोतल प्रकार चुनें", "Bottle Type": "बोतल का प्रकार",
    "Old Bottle / Refill": "पुरानी बोतल / रिफिल", "New Bottle": "नई बोतल", "Continue to quantity": "मात्रा चुनें",
    "Choose Size & Quantity": "आकार और मात्रा चुनें", "Review order": "ऑर्डर देखें", "Review & Submit": "समीक्षा और जमा करें",
    Subtotal: "उप-योग", "Delivery Fee": "डिलीवरी शुल्क", Total: "कुल", "Payment on delivery · Online UPI coming later": "डिलीवरी पर भुगतान · ऑनलाइन UPI जल्द उपलब्ध होगा",
    "I confirm my delivery details are correct.": "मैं पुष्टि करता/करती हूँ कि मेरा डिलीवरी विवरण सही है।",
    "Confirm Water Order →": "पानी का ऑर्डर पक्का करें →", "Placing Order...": "ऑर्डर किया जा रहा है...",
    "Order Received!": "ऑर्डर प्राप्त हुआ!", "Thank you for choosing Zam Zam Water.": "ज़म ज़म वॉटर चुनने के लिए धन्यवाद।",
    "Track My Order": "मेरा ऑर्डर ट्रैक करें", "Contact Us": "संपर्क करें", Mobile: "मोबाइल", Pincode: "पिनकोड",
    Details: "विवरण", Delivery: "डिलीवरी", Bottle: "बोतल", Quantity: "मात्रा", Review: "समीक्षा",
    "Track your orders": "अपने ऑर्डर ट्रैक करें", "Enter the mobile number used while ordering.": "ऑर्डर में उपयोग किया गया मोबाइल नंबर दर्ज करें।",
    "ORDER UPDATES": "ऑर्डर अपडेट", "Track all your orders": "अपने सभी ऑर्डर ट्रैक करें", "Enter only the mobile number used while ordering.": "केवल वही मोबाइल नंबर दर्ज करें जिससे ऑर्डर किया था।",
    "Mobile Number": "मोबाइल नंबर", "10-digit mobile number": "10 अंकों का मोबाइल नंबर", "Refresh Order Status": "ऑर्डर स्थिति रीफ़्रेश करें", "View My Orders": "मेरे ऑर्डर देखें",
    "Scheduled slot": "निर्धारित स्लॉट", "✓ Payment done": "✓ भुगतान पूरा", "Payment pending": "भुगतान बाकी", "Order progress": "ऑर्डर की प्रगति",
    "Payment requests": "भुगतान अनुरोध", "Requested amount": "अनुरोधित राशि", "✓ Payment confirmed": "✓ भुगतान की पुष्टि हुई", "Request cancelled": "अनुरोध रद्द",
    "Payment reported · awaiting verification": "भुगतान बताया गया · सत्यापन बाकी", "UPI transaction reference / UTR": "UPI लेनदेन संदर्भ / UTR", "Enter the reference from your UPI app": "अपने UPI ऐप का संदर्भ दर्ज करें",
    "Find My Orders": "मेरे ऑर्डर खोजें", "Order history": "ऑर्डर इतिहास", "Delivery status": "डिलीवरी स्थिति",
    "Order received": "ऑर्डर प्राप्त", Accepted: "स्वीकृत", Preparing: "तैयार हो रहा है", "Out for delivery": "डिलीवरी के लिए निकला",
    Delivered: "डिलीवर हुआ", Completed: "पूरा हुआ", Rejected: "अस्वीकृत", Cancelled: "रद्द", "Delivery failed": "डिलीवरी विफल", Rescheduled: "पुनर्निर्धारित",
    "Choose a UPI app": "UPI ऐप चुनें", "Other UPI apps": "अन्य UPI ऐप", "I’ve paid": "मैंने भुगतान किया है",
    "Submit payment for verification": "सत्यापन के लिए भुगतान जमा करें", "WhatsApp Chat ↗": "व्हाट्सऐप चैट ↗",
    "Loading products and delivery slots...": "उत्पाद और डिलीवरी स्लॉट लोड हो रहे हैं...", Save: "सहेजें", Delete: "हटाएँ", Refresh: "रीफ़्रेश",
  },
  kn: {
    "FRESH WATER · TUMKUR": "ತಾಜಾ ನೀರು · ತುಮಕೂರು", "Pure Water,": "ಶುದ್ಧ ನೀರು,", "for every sip.": "ಪ್ರತಿ ಗುಟುಕಿಗೂ।",
    "Fresh, mineral-rich drinking water from Zam Zam Water, delivered to your home, office, or event with a cleaner, faster, more reliable experience.": "ಝಮ್ ಝಮ್ ವಾಟರ್‌ನ ತಾಜಾ ಖನಿಜಯುಕ್ತ ಕುಡಿಯುವ ನೀರನ್ನು ನಿಮ್ಮ ಮನೆ, ಕಚೇರಿ ಅಥವಾ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಸ್ವಚ್ಛವಾಗಿ, ವೇಗವಾಗಿ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹವಾಗಿ ತಲುಪಿಸಲಾಗುತ್ತದೆ।",
    "Track an order →": "ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ →", "✓ Easy ordering": "✓ ಸುಲಭ ಆರ್ಡರ್", "✓ Flexible delivery": "✓ ಅನುಕೂಲಕರ ಡೆಲಿವರಿ", "✓ Pay on delivery": "✓ ಡೆಲಿವರಿ ವೇಳೆ ಪಾವತಿ",
    "AVAILABLE DAILY": "ಪ್ರತಿದಿನ ಲಭ್ಯ", "Fresh. Clean. Trusted.": "ತಾಜಾ। ಸ್ವಚ್ಛ। ವಿಶ್ವಾಸಾರ್ಹ।", "Same-day delivery": "ಅದೇ ದಿನ ಡೆಲಿವರಿ", "Bottles ready": "ಬಾಟಲಿಗಳು ಸಿದ್ಧ", "Customer rating": "ಗ್ರಾಹಕರ ರೇಟಿಂಗ್",
    "Choose your water": "ನಿಮ್ಮ ನೀರನ್ನು ಆಯ್ಕೆಮಾಡಿ", "Select refills or new bottles in the size that fits your home and routine.": "ನಿಮ್ಮ ಮನೆ ಮತ್ತು ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕ ಗಾತ್ರದ ರೀಫಿಲ್ ಅಥವಾ ಹೊಸ ಬಾಟಲಿ ಆಯ್ಕೆಮಾಡಿ।",
    "Pick a delivery slot": "ಡೆಲಿವರಿ ಸ್ಲಾಟ್ ಆಯ್ಕೆಮಾಡಿ", "Reserve a convenient time window that matches your schedule and location.": "ನಿಮ್ಮ ಸಮಯ ಮತ್ತು ಸ್ಥಳಕ್ಕೆ ಹೊಂದುವ ಅನುಕೂಲಕರ ಸ್ಲಾಟ್ ಕಾಯ್ದಿರಿಸಿ।",
    "Track every step": "ಪ್ರತಿ ಹಂತ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", "Follow your order in real time and stay informed from dispatch to delivery.": "ರವಾನೆಯಿಂದ ಡೆಲಿವರಿವರೆಗೆ ನಿಮ್ಮ ಆರ್ಡರ್ ಅನ್ನು ನೇರವಾಗಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ।",
    "Order fresh water in Tumkur": "ತುಮಕೂರಿನಲ್ಲಿ ಶುದ್ಧ ನೀರನ್ನು ಆರ್ಡರ್ ಮಾಡಿ",
    "Pure water, delivered with care.": "ಶುದ್ಧ ನೀರು, ಕಾಳಜಿಯಿಂದ ಮನೆ ಬಾಗಿಲಿಗೆ।",
    "Order Now": "ಈಗ ಆರ್ಡರ್ ಮಾಡಿ", "Track Order": "ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", Admin: "ನಿರ್ವಹಣೆ",
    "Start with your mobile number": "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಿಂದ ಪ್ರಾರಂಭಿಸಿ",
    "We’ll find your saved details, or help you enter them if you’re new.": "ನಿಮ್ಮ ಉಳಿಸಿದ ವಿವರಗಳನ್ನು ಹುಡುಕುತ್ತೇವೆ ಅಥವಾ ಹೊಸ ವಿವರಗಳನ್ನು ನಮೂದಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇವೆ।",
    "10-digit Mobile Number": "10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ", "Enter mobile number": "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ",
    Continue: "ಮುಂದುವರಿಸಿ", "Checking...": "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...", "Check Delivery Pincode": "ಡೆಲಿವರಿ ಪಿನ್‌ಕೋಡ್ ಪರಿಶೀಲಿಸಿ",
    "Confirm service availability before entering your order.": "ಆರ್ಡರ್ ಮಾಡುವ ಮೊದಲು ಸೇವೆಯ ಲಭ್ಯತೆಯನ್ನು ಖಚಿತಪಡಿಸಿ।",
    "View full order history →": "ಸಂಪೂರ್ಣ ಆರ್ಡರ್ ಇತಿಹಾಸ ನೋಡಿ →", "6-digit Pincode": "6 ಅಂಕಿಯ ಪಿನ್‌ಕೋಡ್",
    "Check Availability": "ಲಭ್ಯತೆ ಪರಿಶೀಲಿಸಿ", "📍 Detect Pincode From My Location": "📍 ನನ್ನ ಸ್ಥಳದಿಂದ ಪಿನ್‌ಕೋಡ್ ಪತ್ತೆ ಮಾಡಿ",
    "Continue to details": "ವಿವರಗಳಿಗೆ ಮುಂದುವರಿಸಿ", Back: "ಹಿಂದೆ", "Your Details": "ನಿಮ್ಮ ವಿವರಗಳು",
    "Full Name *": "ಪೂರ್ಣ ಹೆಸರು *", "Full Delivery Address *": "ಪೂರ್ಣ ಡೆಲಿವರಿ ವಿಳಾಸ *", "Landmark (optional)": "ಗುರುತು ಸ್ಥಳ (ಐಚ್ಛಿಕ)",
    "Continue to delivery": "ಡೆಲಿವರಿಗೆ ಮುಂದುವರಿಸಿ", "Select Delivery Time": "ಡೆಲಿವರಿ ಸಮಯ ಆಯ್ಕೆಮಾಡಿ",
    "Delivery Date *": "ಡೆಲಿವರಿ ದಿನಾಂಕ *", "Preferred Time Slot *": "ಆದ್ಯತೆಯ ಸಮಯ ಸ್ಲಾಟ್ *",
    "Choose a date first": "ಮೊದಲು ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ", "Choose available time": "ಲಭ್ಯ ಸಮಯ ಆಯ್ಕೆಮಾಡಿ",
    "Times are shown in IST. Every upcoming 15-minute slot is available across the full day and night.": "ಸಮಯವನ್ನು IST ಯಲ್ಲಿ ತೋರಿಸಲಾಗಿದೆ. ಹಗಲು ಮತ್ತು ರಾತ್ರಿ ಮುಂದಿನ ಎಲ್ಲಾ 15 ನಿಮಿಷದ ಸ್ಲಾಟ್‌ಗಳು ಲಭ್ಯವಿವೆ।",
    "Continue to bottle type": "ಬಾಟಲಿ ಪ್ರಕಾರಕ್ಕೆ ಮುಂದುವರಿಸಿ", "Bottle Type": "ಬಾಟಲಿ ಪ್ರಕಾರ",
    "Old Bottle / Refill": "ಹಳೆಯ ಬಾಟಲಿ / ರೀಫಿಲ್", "New Bottle": "ಹೊಸ ಬಾಟಲಿ", "Continue to quantity": "ಪ್ರಮಾಣಕ್ಕೆ ಮುಂದುವರಿಸಿ",
    "Choose Size & Quantity": "ಗಾತ್ರ ಮತ್ತು ಪ್ರಮಾಣ ಆಯ್ಕೆಮಾಡಿ", "Review order": "ಆರ್ಡರ್ ಪರಿಶೀಲಿಸಿ", "Review & Submit": "ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸಲ್ಲಿಸಿ",
    Subtotal: "ಉಪಮೊತ್ತ", "Delivery Fee": "ಡೆಲಿವರಿ ಶುಲ್ಕ", Total: "ಒಟ್ಟು", "Payment on delivery · Online UPI coming later": "ಡೆಲಿವರಿಯ ವೇಳೆ ಪಾವತಿ · ಆನ್‌ಲೈನ್ UPI ಶೀಘ್ರದಲ್ಲೇ",
    "I confirm my delivery details are correct.": "ನನ್ನ ಡೆಲಿವರಿ ವಿವರಗಳು ಸರಿಯಾಗಿವೆ ಎಂದು ದೃಢೀಕರಿಸುತ್ತೇನೆ।",
    "Confirm Water Order →": "ನೀರಿನ ಆರ್ಡರ್ ದೃಢೀಕರಿಸಿ →", "Placing Order...": "ಆರ್ಡರ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    "Order Received!": "ಆರ್ಡರ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!", "Thank you for choosing Zam Zam Water.": "ಝಮ್ ಝಮ್ ವಾಟರ್ ಆಯ್ಕೆಮಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು।",
    "Track My Order": "ನನ್ನ ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", "Contact Us": "ಸಂಪರ್ಕಿಸಿ", Mobile: "ಮೊಬೈಲ್", Pincode: "ಪಿನ್‌ಕೋಡ್",
    Details: "ವಿವರಗಳು", Delivery: "ಡೆಲಿವರಿ", Bottle: "ಬಾಟಲಿ", Quantity: "ಪ್ರಮಾಣ", Review: "ಪರಿಶೀಲನೆ",
    "Track your orders": "ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", "Enter the mobile number used while ordering.": "ಆರ್ಡರ್ ಮಾಡುವಾಗ ಬಳಸಿದ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ।",
    "ORDER UPDATES": "ಆರ್ಡರ್ ಅಪ್‌ಡೇಟ್‌ಗಳು", "Track all your orders": "ನಿಮ್ಮ ಎಲ್ಲಾ ಆರ್ಡರ್‌ಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ", "Enter only the mobile number used while ordering.": "ಆರ್ಡರ್ ಮಾಡಲು ಬಳಸಿದ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಮಾತ್ರ ನಮೂದಿಸಿ।",
    "Mobile Number": "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ", "10-digit mobile number": "10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ", "Refresh Order Status": "ಆರ್ಡರ್ ಸ್ಥಿತಿ ರಿಫ್ರೆಶ್ ಮಾಡಿ", "View My Orders": "ನನ್ನ ಆರ್ಡರ್‌ಗಳನ್ನು ನೋಡಿ",
    "Scheduled slot": "ನಿಗದಿತ ಸ್ಲಾಟ್", "✓ Payment done": "✓ ಪಾವತಿ ಪೂರ್ಣ", "Payment pending": "ಪಾವತಿ ಬಾಕಿ", "Order progress": "ಆರ್ಡರ್ ಪ್ರಗತಿ",
    "Payment requests": "ಪಾವತಿ ವಿನಂತಿಗಳು", "Requested amount": "ವಿನಂತಿಸಿದ ಮೊತ್ತ", "✓ Payment confirmed": "✓ ಪಾವತಿ ದೃಢೀಕರಿಸಲಾಗಿದೆ", "Request cancelled": "ವಿನಂತಿ ರದ್ದು",
    "Payment reported · awaiting verification": "ಪಾವತಿ ವರದಿ ಮಾಡಲಾಗಿದೆ · ಪರಿಶೀಲನೆ ಬಾಕಿ", "UPI transaction reference / UTR": "UPI ವಹಿವಾಟು ಉಲ್ಲೇಖ / UTR", "Enter the reference from your UPI app": "ನಿಮ್ಮ UPI ಆಪ್‌ನ ಉಲ್ಲೇಖ ನಮೂದಿಸಿ",
    "Find My Orders": "ನನ್ನ ಆರ್ಡರ್‌ಗಳನ್ನು ಹುಡುಕಿ", "Order history": "ಆರ್ಡರ್ ಇತಿಹಾಸ", "Delivery status": "ಡೆಲಿವರಿ ಸ್ಥಿತಿ",
    "Order received": "ಆರ್ಡರ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ", Accepted: "ಸ್ವೀಕರಿಸಲಾಗಿದೆ", Preparing: "ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ", "Out for delivery": "ಡೆಲಿವರಿಗೆ ಹೊರಟಿದೆ",
    Delivered: "ತಲುಪಿಸಲಾಗಿದೆ", Completed: "ಪೂರ್ಣಗೊಂಡಿದೆ", Rejected: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ", Cancelled: "ರದ್ದು", "Delivery failed": "ಡೆಲಿವರಿ ವಿಫಲ", Rescheduled: "ಮರುನಿಗದಿಪಡಿಸಲಾಗಿದೆ",
    "Choose a UPI app": "UPI ಆಪ್ ಆಯ್ಕೆಮಾಡಿ", "Other UPI apps": "ಇತರೆ UPI ಆಪ್‌ಗಳು", "I’ve paid": "ನಾನು ಪಾವತಿಸಿದ್ದೇನೆ",
    "Submit payment for verification": "ಪರಿಶೀಲನೆಗಾಗಿ ಪಾವತಿ ಸಲ್ಲಿಸಿ", "WhatsApp Chat ↗": "ವಾಟ್ಸ್ಆಪ್ ಚಾಟ್ ↗",
    "Loading products and delivery slots...": "ಉತ್ಪನ್ನಗಳು ಮತ್ತು ಡೆಲಿವರಿ ಸ್ಲಾಟ್‌ಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...", Save: "ಉಳಿಸಿ", Delete: "ಅಳಿಸಿ", Refresh: "ರಿಫ್ರೆಶ್",
  },
};

const originals = new WeakMap<Node, string>();
const rendered = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function translatedText(source: string, language: Language) {
  if (language === "en") return source;
  const dictionary = translations[language];
  const leading = source.match(/^\s*/)?.[0] || "";
  const trailing = source.match(/\s*$/)?.[0] || "";
  const core = source.trim();
  if (!core) return source;
  if (dictionary[core]) return leading + dictionary[core] + trailing;
  let result = core;
  const replacements: Array<[string, string]> = language === "hi"
    ? [["Step ", "चरण "], [" of ", " / "], ["Minimum ", "न्यूनतम "], ["Maximum ", "अधिकतम "], [" per bottle", " प्रति बोतल"], ["Selected: ", "चयनित: "], [" bottles", " बोतलें"], ["Delivery: ", "डिलीवरी: "]]
    : [["Step ", "ಹಂತ "], [" of ", " / "], ["Minimum ", "ಕನಿಷ್ಠ "], ["Maximum ", "ಗರಿಷ್ಠ "], [" per bottle", " ಪ್ರತಿ ಬಾಟಲಿಗೆ"], ["Selected: ", "ಆಯ್ಕೆ: "], [" bottles", " ಬಾಟಲಿಗಳು"], ["Delivery: ", "ಡೆಲಿವರಿ: "]];
  for (const [from, to] of replacements) result = result.replace(from, to);
  return leading + result + trailing;
}

function translateNode(root: Node, language: Language) {
  const nodes: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) nodes.push(root as Text);
  if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_NODE) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        return parent && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  }
  for (const node of nodes) {
    if (node.data !== rendered.get(node)) originals.set(node, node.data);
    const value = translatedText(originals.get(node) ?? node.data, language);
    rendered.set(node, value);
    if (node.data !== value) node.data = value;
  }
  const elements = root.nodeType === Node.ELEMENT_NODE
    ? [root as Element, ...(root as Element).querySelectorAll("*")]
    : [...document.querySelectorAll("*")];
  for (const element of elements) {
    const saved = originalAttributes.get(element) || new Map<string, string>();
    for (const attribute of ["placeholder", "title", "aria-label"]) {
      const current = element.getAttribute(attribute);
      if (current !== null && !saved.has(attribute)) saved.set(attribute, current);
      const source = saved.get(attribute);
      if (source) element.setAttribute(attribute, translatedText(source, language));
    }
    originalAttributes.set(element, saved);
  }
}

export function SiteLanguage() {
  useEffect(() => {
    let language = (localStorage.getItem("zamzam-language") || "en") as Language;
    if (!(["en", "hi", "kn"] as string[]).includes(language)) language = "en";
    document.documentElement.lang = language;
    translateNode(document.body, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateNode(mutation.target, language);
        for (const node of mutation.addedNodes) translateNode(node, language);
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    const changeLanguage = (event: Event) => {
      language = (event as CustomEvent<Language>).detail;
      document.documentElement.lang = language;
      translateNode(document.body, language);
    };
    window.addEventListener("zamzam-language-change", changeLanguage);
    return () => {
      observer.disconnect();
      window.removeEventListener("zamzam-language-change", changeLanguage);
    };
  }, []);
  return null;
}
