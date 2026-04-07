"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useReport } from "@/context/ReportContext"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { triggerHapticImpact } from "@/lib/haptics"
import ProgressBar from "./ProgressBar"
import NotificationBanner from "./NotificationBanner"
import { QuizLaunchProgressBar } from "./ProgressBarSide"
import { getBootstrapUrl, resetBootstrapBust } from "@/lib/bootstrapFetch"
import { performLogout } from "@/lib/logout"
import { getSettings } from "@/lib/settings"
import { seedFrom, seededShuffle } from "../utils/shuffle"
import { QuizSpinWheelOverlay, PENDING_SPIN_LS } from "@/components/SpinWheel"
import { useNotificationsOptional } from "@/context/NotificationContext"
import { generateQuizPdf } from "@/lib/generateQuizPdf"
import { getDeviceFingerprint } from "@/utils/deviceFingerprint"

const XeroxDownloadAnimation = dynamic(() => import("./XeroxDownloadAnimation"), { ssr: false })
import { RocketIcon, TimerIcon, FileTextIcon, LightbulbIcon, AlertIcon, RefreshIcon, XIcon, CheckIcon, UserIcon, BotIcon, DownloadIcon } from "./AnimatedIcons"
const Confetti = dynamic(() => import("./Confetti"), { ssr: false })

type Q = { category?: string; difficulty?: "Easy" | "Medium" | "Hard"; question: string; options: string[]; correct: number; hint?: string; explanation?: string }
type QuestionResult = { timeTakenMs: number; correct: boolean; userSelectedIndex: number }

function mapPracticeApiToQuestions(arr: unknown): Q[] {
  if (!Array.isArray(arr)) return []
  return arr.map((q: any) => ({
    category: q.category ?? "General",
    difficulty: (q.difficulty ?? "Easy") as "Easy" | "Medium" | "Hard",
    question: String(q.question ?? "").trim(),
    options: Array.isArray(q.options) ? q.options.filter((o: any) => o != null && String(o).trim()) : [],
    correct: Number(q.correct ?? 0),
    hint: q.hint,
    explanation: q.explanation
  }))
}

const QUIZ_STORAGE_KEY = "daily_quiz_completed"
const DEFAULT_RULES: Record<string, string> = {
  en: "• Answer all questions within the time limit\n• Each question has 30 seconds\n• Select one answer per question\n• Once you select an answer, it is final — you cannot change it\n• Stay in fullscreen and on this tab; switching tabs or exiting fullscreen may block your account after 3 warnings\n• Leaderboard ranked by score, then by fastest time",
  hi: "• समय सीमा के भीतर सभी प्रश्नों का उत्तर दें\n• प्रत्येक प्रश्न के लिए 30 सेकंड\n• प्रत्येक प्रश्न का एक उत्तर चुनें\n• एक बार चुना गया उत्तर अंतिम है — बदला नहीं जा सकता\n• फुलस्क्रीन और इस टैब पर रहें; टैब बदलने या फुलस्क्रीन से बाहर निकलने पर 3 चेतावनियों के बाद खाता अवरुद्ध हो सकता है\n• लीडरबोर्ड स्कोर से रैंक, फिर सबसे तेज़ समय",
  es: "• Responde todas las preguntas dentro del límite de tiempo\n• Cada pregunta tiene 30 segundos\n• Selecciona una respuesta por pregunta\n• Una vez seleccionada, la respuesta es definitiva — no puedes cambiarla\n• Mantente en pantalla completa y en esta pestaña; cambiar de pestaña o salir puede bloquear tu cuenta tras 3 avisos\n• Clasificación por puntuación, luego por tiempo más rápido",
  mr: "• सर्व प्रश्न वेळेच्या मर्यादेत उत्तर द्या\n• प्रत्येक प्रश्नासाठी 30 सेकंद आहेत\n• प्रत्येक प्रश्नासाठी एकच उत्तर निवडा\n• एकदा निवडलेले उत्तर अंतिम — ते बदलता येत नाही\n• फुलस्क्रीन आणि या टॅबवर रहा; टॅब बदलणे किंवा फुलस्क्रीन बाहेर पडणे 3 चेतावणीनंतर खाते अवरुद्ध करू शकते\n• लीडरबोर्ड गुणांनुसार रँक, नंतर सर्वात जलद वेळेनुसार",
  ta: "• அனைத்து கேள்விகளுக்கும் நேர வரம்பிற்குள் பதிலளிக்கவும்\n• ஒவ்வொரு கேள்விக்கும் 30 விநாடிகள்\n• ஒவ்வொரு கேள்விக்கும் ஒரு பதிலை தேர்வு செய்யவும்\n• தேர்ந்தெடுத்த பதில் இறுதி — மாற்ற முடியாது\n• முழுத்திரையில் இந்த தாவலில் இருங்கள்; தாவல் மாற்றல் அல்லது வெளியேறல் 3 எச்சரிக்கைகளுக்குப் பிறகு கணக்கைத் தடுக்கும்\n• லீடர்போர்டு மதிப்பெண் அடிப்படையில், பின்னர் வேகமான நேரத்தின் அடிப்படையில் வரிசைப்படுத்தப்படும்",
  te: "• అన్ని ప్రశ్నలకు సమయ పరిమితిలో సమాధానం ఇవ్వండి\n• ప్రతి ప్రశ్నకు 30 సెకన్లు ఉన్నాయి\n• ప్రతి ప్రశ్నకు ఒకే సమాధానాన్ని ఎంచుకోండి\n• ఎంచుకున్న సమాధానం అంతిమం — మార్చలేరు\n• పూర్తి స్క్రీన్ మరియు ఈ ట్యాబ్లో ఉండండి; ట్యాబ్ మారడం లేదా నిష్క్రమించడం 3 హెచ్చరికల తర్వాత ఖాతాను నిరోధించవచ్చు\n• లీడర్‌బోర్డ్ స్కోర్ ఆధారంగా ర్యాంక్ చేయబడుతుంది, తరువాత వేగవంతమైన సమయం ఆధారంగా",
  kn: "• ಸಮಯದ ಮಿತಿಯೊಳಗೆ ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ\n• ಪ್ರತಿ ಪ್ರಶ್ನೆಗೆ 30 ಸೆಕೆಂಡುಗಳು\n• ಪ್ರತಿ ಪ್ರಶ್ನೆಗೆ ಒಂದು ಉತ್ತರವನ್ನು ಆಯ್ಕೆಮಾಡಿ\n• ಆಯ್ಕೆಮಾಡಿದ ಉತ್ತರ ಅಂತಿಮ — ಬದಲಾಯಿಸಲಾಗುವುದಿಲ್ಲ\n• ಪೂರ್ಣತೆ ಪರದೆಯಲ್ಲಿ ಮತ್ತು ಈ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಇರಿ; ಟ್ಯಾಬ್ ಬದಲಾಯಿಸುವುದು ಅಥವಾ ನಿರ್ಗಮಿಸುವುದು 3 ಎಚ್ಚರಿಕೆಗಳ ನಂತರ ಖಾತೆಯನ್ನು ನಿರ್ಬಂಧಿಸಬಹುದು\n• ಲೀಡರ್‌ಬೋರ್ಡ್ ಸ್ಕೋರ್ ಮೂಲಕ ಶ್ರೇಯಾಂಕ, ನಂತರ ಅತ್ಯಂತ ವೇಗವಾದ ಸಮಯ",
  ml: "• സമശക്തിയുള്ള എല്ലാ ചോദ്യങ്ങൾക്കും ഉത്തരം നൽകുക\n• ഓരോ ചോദ്യത്തിനും 30 സെക്കൻഡ്\n• ഓരോ ചോദ്യത്തിനും ഒരു ഉത്തരം തിരഞ്ഞെടുക്കുക\n• തിരഞ്ഞെടുത്ത ഉത്തരം അന്തിമം — മാറ്റാൻ കഴിയില്ല\n• ഫുൾസ്‌ക്രീനിലും ഈ ടാബിലും തുടരുക; ടാബ് മാറ്റുകയോ എക്സിറ്റ് ചെയ്യുകയോ ചെയ്താൽ 3 മുന്നറിയിപ്പുകൾക്ക് ശേഷം അക്കൗണ്ട് തടയപ്പെടും\n• ലീഡർബോർഡ് സ്കോർ അനുసരിച്ച് റാങ്ക്, പിന്നീട് വേഗത്തിലുള്ള സമയം",
  gu: "• આપેલ સમયમાં બધા પ્રશ્નોના જવાબ આપો\n• દરેક પ્રશ્ન માટે ૩૦ સેકન્ડ\n• દરેક પ્રશ્ન માટે એક વિકલ્પ પસંદ કરો\n• પસંદ કરેલ જવાબ અંતિમ છે — બદલી શકાશે નહીં\n• ફુલસ્ક્રીન અને આ ટેબમાં જ રહો; ટેબ બદલવા પર ૩ ચેતવણી પછી એકાઉન્ટ બ્લોક થશે\n• લીડરબોર્ડ સ્કોર અને સમય પર આધારિત છે",
  bn: "• নির্দিষ্ট সময়ের মধ্যে সব প্রশ্নের উত্তর দিন\n• প্রতিটি প্রশ্নের জন্য ৩০ সেকেন্ড সময়\n• প্রতিটি প্রশ্নের জন্য একটি বিকল্প বেছে নিন\n• নির্বাচিত উত্তর চূড়ান্ত — পরিবর্তন করা যাবে না\n• ফুলস্ক্রিন এবং এই ট্যাবেই থাকুন; ট্যাব পরিবর্তন করলে ৩টি সতর্কতার পর অ্যাকাউন্ট ব্লক হবে\n• লিডারবোর্ড স্কোর এবং সময়ের ওপর ভিত্তি করে তৈরি হবে"
}

const LANG_NAMES: Record<string, string> = { en: "English", te: "తెలుగు", hi: "हिंदी", ta: "தமிழ்", kn: "ಕನ್ನಡ", ml: "മലയാളം", gu: "ગુજરાતી", bn: "বাংলা", es: "Español", mr: "मराठी" }
const QUIZ_START_LANGUAGES = ["en", "te", "hi", "ta", "kn", "ml", "gu", "bn"] as const

const UI_LABELS: Record<string, Record<string, string>> = {
  en: {
    readyToStart: "Ready to Start?",
    readRulesPickLang: "Read the rules, pick your language, then begin. The quiz will open in fullscreen — stay focused!",
    rules: "Rules",
    timerStartsOnClick: "Timer starts when you click Start",
    focusFullscreen: "Focus & fullscreen",
    quizOpensFullscreen: "The quiz opens in fullscreen. Stay in fullscreen until you finish.",
    doNotSwitchTabs: "Do not switch tabs or exit fullscreen. Each violation counts as a warning.",
    threeWarningsBlocked: "3 warnings = account blocked. Pay ₹50 to unblock.",
    agreeCheckbox: "I agree to stay in fullscreen and not switch tabs. I understand that 3 violations will block my account.",
    selectLanguage: "Select Language",
    startQuiz: "Start Quiz",
    agreeToStart: "Agree to rules to start",
    quizEndedBtn: "Quiz Ended",
    quizHasEnded: "Quiz has ended",
    practiceQuiz: "Practice Quiz",
    youHaveQuestions: "You have {n} question(s). Timer starts when you click Start.",
    quizCompleted: "Quiz Completed",
    totalTime: "Total time",
    completedNewQuizAppear: "Completed — A new quiz will appear here when it's available. This state is saved and will show on any device when you log in.",
    scoreCouldntSync: "Score couldn't sync. Your result is saved locally.",
    retrySync: "Retry sync",
    downloadAgainBelow: "You can download your report again below if needed.",
    preparing: "Preparing…",
    downloadPdfReport: "Download PDF Report",
    accountBlocked: "Account Blocked",
    exceededLimit: "You exceeded the allowed limit for switching tabs or exiting fullscreen during the quiz.",
    loggingOut: "Logging out in 5 seconds…",
    noQuizAvailable: "No Quiz Available Yet",
    noQuizTrackProgress: "A new quiz will appear here once it's released. Track progress below.",
    checkingCompletion: "Checking completion…",
    endsLabel: "Ends",
  },
  hi: {
    readyToStart: "शुरू करने के लिए तैयार?",
    readRulesPickLang: "नियम पढ़ें, भाषा चुनें, फिर शुरू करें। क्विज़ फुलस्क्रीन में खुलेगी — ध्यान रखें!",
    rules: "नियम",
    timerStartsOnClick: "स्टार्ट पर क्लिक करने पर टाइमर शुरू होगा",
    focusFullscreen: "ध्यान और फुलस्क्रीन",
    quizOpensFullscreen: "क्विज़ फुलस्क्रीन में खुलेगी। खत्म होने तक फुलस्क्रीन में रहें।",
    doNotSwitchTabs: "टैब न बदलें और फुलस्क्रीन से बाहर न निकलें। हर उल्लंघन पर चेतावनी।",
    threeWarningsBlocked: "3 चेतावनी = खाता अवरुद्ध। अनब्लॉक के लिए ₹50 दें।",
    agreeCheckbox: "मैं फुलस्क्रीन में रहने और टैब न बदलने पर सहमत हूँ। 3 उल्लंघन पर खाता अवरुद्ध हो जाएगा।",
    selectLanguage: "भाषा चुनें",
    startQuiz: "क्विज़ शुरू करें",
    agreeToStart: "शुरू करने के लिए नियमों से सहमत हों",
    quizEndedBtn: "क्विज़ समाप्त",
    quizHasEnded: "क्विज़ समाप्त हो चुकी है",
    practiceQuiz: "अभ्यास क्विज़",
    youHaveQuestions: "आपके पास {n} प्रश्न हैं। स्टार्ट पर क्लिक करने पर टाइमर शुरू।",
    quizCompleted: "क्विज़ पूर्ण",
    totalTime: "कुल समय",
    completedNewQuizAppear: "पूर्ण — नया क्विज़ यहाँ उपलब्ध होने पर दिखेगा। यह स्थिति सहेजी गई है और लॉग इन पर किसी भी डिवाइस पर दिखेगी।",
    scoreCouldntSync: "स्कोर सिंक नहीं हुआ। आपका नतीजा स्थानीय रूप से सहेजा गया।",
    retrySync: "फिर सिंक करें",
    downloadAgainBelow: "ज़रूरत हो तो नीचे से रिपोर्ट फिर डाउनलोड कर सकते हैं।",
    preparing: "तैयार हो रहा है…",
    downloadPdfReport: "PDF रिपोर्ट डाउनलोड करें",
    accountBlocked: "खाता अवरुद्ध",
    exceededLimit: "क्विज़ के दौरान टैब बदलने या फुलस्क्रीन से बाहर निकलने की अनुमत सीमा पार हो गई।",
    loggingOut: "5 सेकंड में लॉग आउट हो रहा है…",
    noQuizAvailable: "अभी कोई क्विज़ उपलब्ध नहीं",
    noQuizTrackProgress: "नया क्विज़ जारी होने पर यहाँ दिखेगा। नीचे प्रगति देखें।",
    checkingCompletion: "पूर्णता जाँच रहे हैं…",
    endsLabel: "समाप्त",
  },
  es: {
    readyToStart: "¿Listo para empezar?",
    readRulesPickLang: "Lee las reglas, elige tu idioma y empieza. El quiz se abrirá en pantalla completa.",
    rules: "Reglas",
    timerStartsOnClick: "El temporizador empieza al hacer clic en Iniciar.",
    focusFullscreen: "Enfoque y pantalla completa",
    quizOpensFullscreen: "El quiz se abre en pantalla completa. Mantente así hasta terminar.",
    doNotSwitchTabs: "No cambies de pestaña ni salgas de pantalla completa. Cada incidencia cuenta como advertencia.",
    threeWarningsBlocked: "3 advertencias = cuenta bloqueada. Paga ₹50 para desbloquear.",
    agreeCheckbox: "Acepto permanecer en pantalla completa y no cambiar de pestaña. 3 incidencias bloquearán mi cuenta.",
    selectLanguage: "Elegir idioma",
    startQuiz: "Iniciar quiz",
    agreeToStart: "Acepta las reglas para iniciar",
    quizEndedBtn: "Quiz terminado",
    quizHasEnded: "El quiz ha terminado",
    practiceQuiz: "Quiz de práctica",
    youHaveQuestions: "Tienes {n} pregunta(s). El temporizador empieza al hacer clic en Iniciar.",
    quizCompleted: "Quiz completado",
    totalTime: "Tiempo total",
    completedNewQuizAppear: "Completado. Un nuevo quiz aparecerá aquí cuando esté disponible. Se guarda y se verá en cualquier dispositivo al iniciar sesión.",
    scoreCouldntSync: "No se pudo sincronizar la puntuación. Tu resultado se guardó localmente.",
    retrySync: "Reintentar sincronización",
    downloadAgainBelow: "Puedes descargar el informe de nuevo abajo si hace falta.",
    preparing: "Preparando…",
    downloadPdfReport: "Descargar informe PDF",
    accountBlocked: "Cuenta bloqueada",
    exceededLimit: "Superaste el límite permitido de cambiar de pestaña o salir de pantalla completa durante el quiz.",
    loggingOut: "Cerrando sesión en 5 segundos…",
    noQuizAvailable: "Aún no hay quiz disponible",
    noQuizTrackProgress: "Un nuevo quiz aparecerá aquí cuando se publique. Sigue el progreso abajo.",
    checkingCompletion: "Comprobando finalización…",
    endsLabel: "Termina",
  },
  mr: {
    readyToStart: "सुरू करण्यास तयार?",
    readRulesPickLang: "नियम वाचा, भाषा निवडा, नंतर सुरू करा. क्विझ फुलस्क्रीनमध्ये उघडेल.",
    rules: "नियम",
    timerStartsOnClick: "स्टार्ट वर क्लिक केल्यावर टाइमर सुरू होतो.",
    focusFullscreen: "लक्ष आणि फुलस्क्रीन",
    quizOpensFullscreen: "क्विझ फुलस्क्रीनमध्ये उघडते. संपेपर्यंत फुलस्क्रीनमध्ये रहा.",
    doNotSwitchTabs: "टॅब बदलू नका आणि फुलस्क्रीनमधून बाहेर पडू नका. प्रत्येक उल्लंघनाला चेतावणी.",
    threeWarningsBlocked: "3 चेतावण्या = खाते अवरुद्ध. अनब्लॉकसाठी ₹50 द्या.",
    agreeCheckbox: "मी फुलस्क्रीनमध्ये रहाण्यास आणि टॅब न बदलण्यास सहमत आहे. 3 उल्लंघनांवर खाते अवरुद्ध होईल.",
    selectLanguage: "भाषा निवडा",
    startQuiz: "क्विझ सुरू करा",
    agreeToStart: "सुरू करण्यासाठी नियमांशी सहमत व्हा",
    quizEndedBtn: "क्विझ संपली",
    quizHasEnded: "क्विझ संपली.",
    practiceQuiz: "सराव क्विझ",
    youHaveQuestions: "तुमच्याकडे {n} प्रश्न आहेत. स्टार्ट वर क्लिक केल्यावर टाइमर सुरू.",
    quizCompleted: "क्विझ पूर्ण",
    totalTime: "एकूण वेळ",
    completedNewQuizAppear: "पूर्ण. नवीन क्विझ उपलब्ध झाल्यावर येथे दिसेल. ही स्थिती सेव्ह होते आणि लॉग इन केल्यावर कोणत्याही डिव्हाइसवर दिसेल.",
    scoreCouldntSync: "स्कोर सिंक झाला नाही. निकाल स्थानिक सेव्ह झाला.",
    retrySync: "पुन्हा सिंक करा",
    downloadAgainBelow: "गरज असेल तर खालीून अहवाल पुन्हा डाउनलोड करू शकता.",
    preparing: "तयार होत आहे…",
    downloadPdfReport: "PDF अहवाल डाउनलोड करा",
    accountBlocked: "खाते अवरुद्ध",
    exceededLimit: "क्विझ दरम्यान टॅब बदलणे किंवा फुलस्क्रीन सोडणे ओलांडले.",
    loggingOut: "५ सेकंदात लॉग आउट होत आहे…",
    noQuizAvailable: "अद्याप क्विझ उपलब्ध नाही",
    noQuizTrackProgress: "नवीन क्विझ प्रकाशित झाल्यावर येथे दिसेल. खाली प्रगती पहा.",
    checkingCompletion: "पूर्णता तपासत आहे…",
    endsLabel: "समाप्त",
  },
  ta: {
    readyToStart: "தொடங்க தயாரா?",
    readRulesPickLang: "விதிகளைப் படியுங்கள், மொழியைத் தேர்ந்தெடுங்கள், பின்னர் தொடங்குங்கள். வினாடி முழுத்திரையில் திறக்கும்.",
    rules: "விதிகள்",
    timerStartsOnClick: "ஸ்டார்ட் கிளிக் செய்தால் டைமர் தொடங்கும்.",
    focusFullscreen: "கவனம் மற்றும் முழுத்திரை",
    quizOpensFullscreen: "வினாடி முழுத்திரையில் திறக்கும். முடிக்கும் வரை முழுத்திரையில் இருங்கள்.",
    doNotSwitchTabs: "தாவல்களை மாற்றாதீர்கள், முழுத்திரையிலிருந்து வெளியேறாதீர்கள். ஒவ்வொரு மீறலும் எச்சரிக்கை.",
    threeWarningsBlocked: "3 எச்சரிக்கைகள் = கணக்கு தடை. தடை நீக்க ₹50.",
    agreeCheckbox: "முழுத்திரையில் இருப்பதற்கும் தாவல் மாறாததற்கும் ஒப்புக்கொள்கிறேன். 3 மீறல்களில் கணக்கு தடை.",
    selectLanguage: "மொழியைத் தேர்ந்தெடு",
    startQuiz: "வினாடியைத் தொடங்கு",
    agreeToStart: "தொடங்க விதிகளுக்கு ஒப்பு",
    quizEndedBtn: "வினாடி முடிந்தது",
    quizHasEnded: "வினாடி முடிந்துவிட்டது.",
    practiceQuiz: "பயிற்சி வினாடி",
    youHaveQuestions: "உங்களிடம் {n} கேள்வி(கள்). ஸ்டார்ட் கிளிக் செய்தால் டைமர் தொடங்கும்.",
    quizCompleted: "வினாடி முடிந்தது",
    totalTime: "மொத்த நேரம்",
    completedNewQuizAppear: "முடிந்தது. புதிய வினாடி கிடைக்கும்போது இங்கே வரும். இந்த நிலை சேமிக்கப்பட்டு உள்நுழைந்தால் எந்த சாதனத்திலும் காணப்படும்.",
    scoreCouldntSync: "ஸ்கோர் ஒத்திசைக்கப்படவில்லை. முடிவு உள்ளூரில் சேமிக்கப்பட்டது.",
    retrySync: "மீண்டும் ஒத்திசை",
    downloadAgainBelow: "தேவைப்பட்டால் கீழே இருந்து அறிக்கையை மீண்டும் பதிவிறக்கம் செய்யலாம்.",
    preparing: "தயாராகிறது…",
    downloadPdfReport: "PDF அறிக்கை பதிவிறக்கம்",
    accountBlocked: "கணக்கு தடை",
    exceededLimit: "வினாடியின் போது தாவல் மாற்றம் அல்லது முழுத்திரை வெளியேறல் அனுமதிக்கப்பட்ட வரம்பை மீறியுள்ளீர்கள்.",
    loggingOut: "5 விநாடிகளில் வெளியேறுகிறது…",
    noQuizAvailable: "இன்னும் வினாடி இல்லை",
    noQuizTrackProgress: "புதிய வினாடி வெளியானதும் இங்கே தோன்றும். கீழே முன்னேற்றம் பார்க்கவும்.",
    checkingCompletion: "முடிவு சரிபார்த்தல்…",
    endsLabel: "முடிவு",
  },
  te: {
    readyToStart: "ప్రారంభించడానికి సిద్ధమా?",
    readRulesPickLang: "నియమాలు చదవండి, భాష ఎంచుకోండి, ఆపై ప్రారంభించండి. క్విజ్ పూర్తి స్క్రీన్‌లో తెరవబడుతుంది.",
    rules: "నియమాలు",
    timerStartsOnClick: "స్టార్ట్ క్లిక్ చేసినప్పుడు టైమర్ ప్రారంభమవుతుంది.",
    focusFullscreen: "ఫోకస్ మరియు పూర్తి స్క్రీన్",
    quizOpensFullscreen: "క్విజ్ పూర్తి స్క్రీన్‌లో తెరవబడుతుంది. ముగించే వరకు పూర్తి స్క్రీన్‌లో ఉండండి.",
    doNotSwitchTabs: "ట్యాబ్ మార్చవద్దు, పూర్తి స్క్రీన్ నుండి నిష్క్రమించవద్దు. ప్రతి ఉల్లంఘనకు హెచ్చరిక.",
    threeWarningsBlocked: "3 హెచ్చరికలు = ఖాతా నిరోధించబడింది. నిరోధం తొలగించడానికి ₹50 చెల్లించండి.",
    agreeCheckbox: "పూర్తి స్క్రీన్‌లో ఉండడానికి మరియు ట్యాబ్ మార్చకుండా ఉండడానికి అంగీకరిస్తున్నాను. 3 ఉల్లంఘనల తర్వాత ఖాతా నిరోధించబడుతుంది.",
    selectLanguage: "భాష ఎంచుకోండి",
    startQuiz: "క్విజ్ ప్రారంభించండి",
    agreeToStart: "ప్రారంభించడానికి నియమాలకు అంగీకరించండి",
    quizEndedBtn: "క్విజ్ ముగిసింది",
    quizHasEnded: "క్విజ్ ముగిసింది.",
    practiceQuiz: "ప్రాక్టీస్ క్విజ్",
    youHaveQuestions: "మీకు {n} ప్రశ్న(లు) ఉన్నాయి. స్టార్ట్ క్లిక్ చేసినప్పుడు టైమర్ ప్రారంభం.",
    quizCompleted: "క్విజ్ పూర్ణమైంది",
    totalTime: "మొత్తం సమయం",
    completedNewQuizAppear: "పూర్తి. కొత్త క్విజ్ అందుబాటులో ఉన్నప్పుడు ఇక్కడ కనిపిస్తుంది. ఈ స్థితి సేవ్ చేయబడుతుంది మరియు లాగిన్ చేసినప్పుడు ఏ పరికరంలోనైనా కనిపిస్తుంది.",
    scoreCouldntSync: "స్కోర్ సింక్ కాలేదు. ఫలితం స్థానికంగా సేవ్ చేయబడింది.",
    retrySync: "మళ్లీ సింక్ చేయండి",
    downloadAgainBelow: "అవసరమైతే క్రింద నుండి రిపోర్ట్ మళ్లీ డౌన్‌లోడ్ చేయవచ్చు.",
    preparing: "సిద్ధం చేస్తోంది…",
    downloadPdfReport: "PDF రిపోర్ట్ డౌన్‌లోడ్ చేయండి",
    accountBlocked: "ఖాతా నిరోధించబడింది",
    exceededLimit: "క్విజ్ సమయంలో ట్యాబ్ మార్చడం లేదా పూర్తి స్క్రీన్ నుండి నిష్క్రమించడం అనుమతించిన పరిమితిని మీరు మించారు.",
    loggingOut: "5 సెకన్లలో లాగ్ అవుట్ అవుతోంది…",
    noQuizAvailable: "ఇంకా క్విజ్ అందుబాటులో లేదు",
    noQuizTrackProgress: "కొత్త క్విజ్ విడుదలైన తర్వాత ఇక్కడ కనిపిస్తుంది. క్రింద పురోగతి చూడండి.",
    checkingCompletion: "పూర్తి తనిఖీ చేస్తోంది…",
    endsLabel: "ముగింపు",
  },
  kn: {
    readyToStart: "ಆರಂಭಿಸಲು ಸಿದ್ಧರಾ?",
    readRulesPickLang: "ನಿಯಮಗಳನ್ನು ಓದಿ, ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ, ನಂತರ ಪ್ರಾರಂಭಿಸಿ. ಕ್ವಿಜ್ ಪೂರ್ಣತೆ ಪರದೆಯಲ್ಲಿ ತೆರೆಯುತ್ತದೆ.",
    rules: "ನಿಯಮಗಳು",
    timerStartsOnClick: "ಸ್ಟಾರ್ಟ್ ಕ್ಲಿಕ್ ಮಾಡಿದಾಗ ಟೈಮರ್ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.",
    focusFullscreen: "ಗಮನ ಮತ್ತು ಪೂರ್ಣತೆ ಪರದೆ",
    quizOpensFullscreen: "ಕ್ವಿಜ್ ಪೂರ್ಣತೆ ಪರದೆಯಲ್ಲಿ ತೆರೆಯುತ್ತದೆ. ಮುಗಿಸುವವರೆಗೂ ಪೂರ್ಣತೆ ಪರದೆಯಲ್ಲಿ ಇರಿ.",
    doNotSwitchTabs: "ಟ್ಯಾಬ್ ಬದಲಾಯಿಸಬೇಡಿ ಮತ್ತು ಪೂರ್ಣತೆ ಪರದೆಯಿಂದ ನಿರ್ಗಮಿಸಬೇಡಿ. ಪ್ರತಿ ಉಲ್ಲಂಘನೆಗೆ ಎಚ್ಚರಿಕೆ.",
    threeWarningsBlocked: "3 ಎಚ್ಚರಿಕೆಗಳು = ಖಾತೆ ನಿರ್ಬಂಧಿತ. ನಿರ್ಬಂಧ ತೆಗೆಯಲು ₹50 ಪಾವತಿಸಿ.",
    agreeCheckbox: "ಪೂರ್ಣತೆ ಪರದೆಯಲ್ಲಿ ಇರಲು ಮತ್ತು ಟ್ಯಾಬ್ ಬದಲಾಯಿಸದಿರಲು ನಾನು ಒಪ್ಪುತ್ತೇನೆ. 3 ಉಲ್ಲಂಘನೆಗಳ ನಂತರ ಖಾತೆ ನಿರ್ಬಂಧಿಸಲ್ಪಡುತ್ತದೆ.",
    selectLanguage: "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ",
    startQuiz: "ಕ್ವಿಜ್ ಪ್ರಾರಂಭಿಸಿ",
    agreeToStart: "ಪ್ರಾರಂಭಿಸಲು ನಿಯಮಗಳಿಗೆ ಒಪ್ಪು",
    quizEndedBtn: "ಕ್ವಿಜ್ ಮುಗಿದಿದೆ",
    quizHasEnded: "ಕ್ವಿಜ್ ಮುಗಿದಿದೆ.",
    practiceQuiz: "ಅಭ್ಯಾಸ ಕ್ವಿಜ್",
    youHaveQuestions: "ನಿಮ್ಮ ಬಳಿ {n} ಪ್ರಶ್ನೆ(ಗಳು) ಉಂಟು. ಸ್ಟಾರ್ಟ್ ಕ್ಲಿಕ್ ಮಾಡಿದಾಗ ಟೈಮರ್ ಪ್ರಾರಂಭ.",
    quizCompleted: "ಕ್ವಿಜ್ ಪೂರ್ಣವಾಯಿತು",
    totalTime: "ಒಟ್ಟು ಸಮಯ",
    completedNewQuizAppear: "ಪೂರ್ಣ. ಹೊಸ ಕ್ವಿಜ್ ಲಭ್ಯವಾದಾಗ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ. ಈ ಸ್ಥಿತಿ ಉಳಿಸಲ್ಪಟ್ಟಿದೆ ಮತ್ತು ಲಾಗಿನ್ ಮಾಡಿದಾಗ ಯಾವುದೇ ಸಾಧನದಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
    scoreCouldntSync: "ಸ್ಕೋರ್ ಸಿಂಕ್ ಆಗಲಿಲ್ಲ. ನಿಮ್ಮ ಫಲಿತಾಂಶ ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲ್ಪಟ್ಟಿದೆ.",
    retrySync: "ಮತ್ತೆ ಸಿಂಕ್ ಮಾಡಿ",
    downloadAgainBelow: "ಅಗತ್ಯವಿದ್ದರೆ ಕೆಳಗಿನಿಂದ ವರದಿಯನ್ನು ಮತ್ತೆ ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದು.",
    preparing: "ತಯಾರಿ…",
    downloadPdfReport: "PDF ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    accountBlocked: "ಖಾತೆ ನಿರ್ಬಂಧಿತ",
    exceededLimit: "ಕ್ವಿಜ್ ಸಮಯದಲ್ಲಿ ಟ್ಯಾಬ್ ಬದಲಾಯಿಸುವುದು ಅಥವಾ ಪೂರ್ಣತೆ ಪರದೆಯಿಂದ ನಿರ್ಗಮಿಸುವುದು ಅನುಮತಿಸಿದ ಮಿತಿಯನ್ನು ನೀವು ಮೀರಿದ್ದೀರಿ.",
    loggingOut: "5 ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಲಾಗ್ ಔಟ್ ಆಗುತ್ತಿದೆ…",
    noQuizAvailable: "ಇನ್ನೂ ಕ್ವಿಜ್ ಲಭ್ಯವಿಲ್ಲ",
    noQuizTrackProgress: "ಹೊಸ ಕ್ವಿಜ್ ಬಿಡುಗಡೆಯಾದ ನಂತರ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ. ಕೆಳಗೆ ಪ್ರಗತಿ ನೋಡಿ.",
    checkingCompletion: "ಪೂರ್ಣತೆ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…",
    endsLabel: "ಮುಗಿಯುವುದು",
  },
  ml: {
    readyToStart: "ആരംഭിക്കാൻ തയ്യാറാണോ?",
    readRulesPickLang: "നിയമങ്ങൾ വായിക്കുക, ഭാഷ തിരഞ്ഞെടുക്കുക, തുടർന്ന് ആരംഭിക്കുക. ക്വിസ് ഫുൾസ്‌ക്രീനിൽ തുറക്കും.",
    rules: "നിയമങ്ങൾ",
    timerStartsOnClick: "സ്റ്റാർട്ട് ക്ലിക്ക് ചെയ്താൽ ടൈമർ ആരംഭിക്കും.",
    focusFullscreen: "ശ്രദ്ധയും ഫുൾസ്‌ക്രീനും",
    quizOpensFullscreen: "ക്വിസ് ഫുൾസ്‌ക്രീനിൽ തുറക്കും. പൂർത്തിയാകും വരെ ഫുൾസ്‌ക്രീനിൽ തുടരുക.",
    doNotSwitchTabs: "ടാബ് മാറ്റരുത്, ഫുൾസ്‌ക്രീനിൽ നിന്ന് എക്സിറ്റ് ചെയ്യരുത്. ഓരോ ലംഘനത്തിനും മുന്നറിയിപ്പ്.",
    threeWarningsBlocked: "3 മുന്നറിയിപ്പുകൾ = അക്കൗണ്ട് തടയപ്പെടും. അൺബ്ലോക്കിന് ₹50 നൽകുക.",
    agreeCheckbox: "ഫുൾസ്‌ക്രീനിൽ തുടരാനും ടാബ് മാറ്റാതിരിക്കാനും ഞാൻ സമ്മതിക്കുന്നു. 3 ലംഘനങ്ങൾക്ക് ശേഷം അക്കൗണ്ട് തടയപ്പെടും.",
    selectLanguage: "ഭാഷ തിരഞ്ഞെടുക്കുക",
    startQuiz: "ക്വിസ് ആരംഭിക്കുക",
    agreeToStart: "ആരംഭിക്കാൻ നിയമങ്ങളോട് സമ്മതിക്കുക",
    quizEndedBtn: "ക്വിസ് അവസാനിച്ചു",
    quizHasEnded: "ക്വിസ് അവസാനിച്ചു.",
    practiceQuiz: "പരിശീലന ക്വിസ്",
    youHaveQuestions: "നിങ്ങൾക്ക് {n} ചോദ്യ(ങ്ങൾ) ഉണ്ട്. സ്റ്റാർട്ട് ക്ലിക്ക് ചെയ്താൽ ടൈമർ ആരംഭിക്കും.",
    quizCompleted: "ക്വിസ് പൂർത്തിയായി",
    totalTime: "ആകെ സമയം",
    completedNewQuizAppear: "പൂർത്തി. പുതിയ ക്വിസ് ലഭ്യമാകുമ്പോൾ ഇവിടെ കാണാം. ഈ അവസ്ഥ സേവ് ചെയ്യപ്പെട്ടിരിക്കുന്നു, ലോഗിൻ ചെയ്യുമ്പോൾ ഏത് ഉപകരണത്തിലും കാണാം.",
    scoreCouldntSync: "സ്കോർ സിങ്ക് ചെയ്യാൻ കഴിഞ്ഞില്ല. നിങ്ങളുടെ ഫലം പ്രാദേശികമായി സേവ് ചെയ്തു.",
    retrySync: "വീണ്ടും സിങ്ക് ചെയ്യുക",
    downloadAgainBelow: "ആവശ്യമെങ്കിൽ താഴെ നിന്ന് റിപ്പോർട്ട് വീണ്ടും ഡൗൺലോഡ് ചെയ്യാം.",
    preparing: "തയ്യാറെടുക്കുന്നു…",
    downloadPdfReport: "PDF റിപ്പോർട്ട് ഡൗൺലോഡ് ചെയ്യുക",
    accountBlocked: "അക്കൗണ്ട് തടയപ്പെട്ടു",
    exceededLimit: "ക്വിസ് സമയത്ത് ടാബ് മാറ്റുകയോ ഫുൾസ്‌ക്രീനിൽ നിന്ന് എക്സിറ്റ് ചെയ്യുകയോ ചെയ്ത് അനുവദനീയമായ പരിധി നിങ്ങൾ കവിഞ്ഞു.",
    loggingOut: "5 സെക്കൻഡിനുള്ളിൽ ലോഗൗട്ട് ചെയ്യുന്നു…",
    noQuizAvailable: "ഇതുവരെ ക്വിസ് ലഭ്യമല്ല",
    noQuizTrackProgress: "പുതിയ ക്വിസ് പ്രസിദ്ധീകരിച്ചാൽ ഇവിടെ കാണാം. താഴെ പുരോഗതി കാണുക.",
    checkingCompletion: "പൂർത്തിയായി എന്ന് പരിശോധിക്കുന്നു…",
    endsLabel: "അവസാനം",
  },
  gu: {
    readyToStart: "શરૂ કરવા તૈયાર છો?",
    readRulesPickLang: "નિયમો વાંચો, ભાષા પસંદ કરો અને શરૂ કરો. ક્વિઝ ફુલસ્ક્રીનમાં ખુલશે!",
    rules: "નિયમો",
    timerStartsOnClick: "શરૂ કરો પર ક્લિક કરતા જ સમય શરૂ થશે",
    focusFullscreen: "ધ્યાન અને ફુલસ્ક્રીન",
    quizOpensFullscreen: "ક્વિઝ ફુલસ્ક્રીનમાં ખુલે છે. પૂર્ણ થાય ત્યાં સુધી ફુલસ્ક્રીન રહો.",
    doNotSwitchTabs: "ટેબ બદલશો નહીં કે ફુલસ્ક્રીનમાંથી બહાર નીકળશો નહીં. દરેક ઉલ્લંઘન પર ચેતવણી મળશે.",
    threeWarningsBlocked: "૩ ચેતવણી = એકાઉન્ટ બ્લોક. અનબ્લોક કરવા માટે ₹૫૦ ચૂકવો.",
    agreeCheckbox: "હું ફુલસ્ક્રીનમાં રહેવા અને ટેબ ન બદલવા માટે સંમત છું. ૩ ઉલ્લંઘન પર એકાઉન્ટ બ્લોક થશે.",
    selectLanguage: "ભાષા પસંદ કરો",
    startQuiz: "ક્વિઝ શરૂ કરો",
    agreeToStart: "શરૂ કરવા માટે નિયમો સાથે સંમત થાઓ",
    quizEndedBtn: "ક્વિઝ પૂર્ણ થઈ",
    quizHasEnded: "ક્વિઝ પૂર્ણ થઈ ગઈ છે",
    practiceQuiz: "પ્રેક્ટિસ ક્વિઝ",
    youHaveQuestions: "તમારી પાસે {n} પ્રશ્નો છે. શરૂ કરો પર ક્લિક કરતા જ સમય શરૂ થશે.",
    quizCompleted: "ક્વિઝ પૂર્ણ",
    totalTime: "કુલ સમય",
    completedNewQuizAppear: "પૂર્ણ — નવી ક્વિઝ ઉપલબ્ધ થતા અહીં દેખાશે. આ સ્થિતિ સેવ છે અને લોગિન કરવા પર કોઈપણ ઉપકરણ પર દેખાશે.",
    scoreCouldntSync: "સ્કોર સિંક થઈ શક્યો નથી. તમારું પરિણામ લોકલ સેવ થયું છે.",
    retrySync: "ફરી પ્રયાસ કરો",
    downloadAgainBelow: "જરૂર હોય તો નીચેથી રિપોર્ટ ફરીથી ડાઉનલોડ કરી શકો છો.",
    preparing: "તૈયારી થઈ રહી છે…",
    downloadPdfReport: "PDF રિપોર્ટ ડાઉનલોડ કરો",
    accountBlocked: "એકાઉન્ટ બ્લોક થયું છે",
    exceededLimit: "ક્વિઝ દરમિયાન ટેબ બદલવા કે ફુલસ્ક્રીનમાંથી બહાર નીકળવાની મર્યાદા તમે ઓળંગી છે.",
    loggingOut: "૫ સેકન્ડમાં લોગઆઉટ થઈ રહ્યું છે…",
    noQuizAvailable: "હજી કોઈ ક્વિઝ ઉપલબ્ધ નથી",
    noQuizTrackProgress: "નવી ક્વિઝ રિલીઝ થયા પછી અહીં દેખાશે. નીચે પ્રગતિ જુઓ.",
    checkingCompletion: "પૂર્ણતા તપાસી રહ્યા છીએ…",
    endsLabel: "સમાપ્તિ",
  },
  bn: {
    readyToStart: "শুরু করতে প্রস্তুত?",
    readRulesPickLang: "নিয়মগুলো পড়ুন, ভাষা বেছে নিন এবং শুরু করুন। কুইজ ফুলস্ক্রিনে খুলবে!",
    rules: "নিয়মাবলী",
    timerStartsOnClick: "শুরু করুন ক্লিক করলেই সময় শুরু হবে",
    focusFullscreen: "মনোযোগ ও ফুলস্ক্রিন",
    quizOpensFullscreen: "কুইজ ফুলস্ক্রিনে খুলবে। শেষ না হওয়া পর্যন্ত ফুলস্ক্রিনে থাকুন।",
    doNotSwitchTabs: "ট্যাব পরিবর্তন করবেন না বা ফুলস্ক্রিন থেকে বেরোবেন না। প্রতিটি ভুলের জন্য সতর্কতা দেওয়া হবে।",
    threeWarningsBlocked: "৩টি সতর্কতা = অ্যাকাউন্ট ব্লক। আনব্লক করতে ₹৫০ দিন।",
    agreeCheckbox: "আমি ফুলস্ক্রিনে থাকতে এবং ট্যাব পরিবর্তন না করতে সম্মত। ৩টি ভুলের জন্য অ্যাকাউন্ট ব্লক হবে।",
    selectLanguage: "ভাষা নির্বাচন করুন",
    startQuiz: "কুইজ শুরু করুন",
    agreeToStart: "শুরু করতে নিয়মে সম্মত হন",
    quizEndedBtn: "কুইজ সমাপ্ত",
    quizHasEnded: "কুইজ শেষ হয়ে গেছে",
    practiceQuiz: "অনুশীলন কুইজ",
    youHaveQuestions: "আপনার কাছে {n}টি প্রশ্ন আছে। শুরু করুন ক্লিক করলেই সময় শুরু হবে।",
    quizCompleted: "কুইজ সম্পূর্ণ",
    totalTime: "মোট সময়",
    completedNewQuizAppear: "সম্পন্ন — নতুন কুইজ উপলব্ধ হলে এখানে দেখা যাবে। এই তথ্য সেভ করা আছে এবং লগইন করলে যেকোনো ডিভাইসে দেখা যাবে।",
    scoreCouldntSync: "স্কোর সিঙ্ক করা যায়নি। আপনার ফলাফল লোকাল সেভ করা হয়েছে।",
    retrySync: "আবার চেষ্টা করুন",
    downloadAgainBelow: "প্রয়োজন হলে নিচে থেকে রিপোর্ট আবার ডাউনলোড করতে পারেন।",
    preparing: "প্রস্তুত হচ্ছে…",
    downloadPdfReport: "PDF রিপোর্ট ডাউনলোড করুন",
    accountBlocked: "অ্যাকাউন্ট ব্লক করা হয়েছে",
    exceededLimit: "কুইজ চলাকালীন ট্যাব পরিবর্তন বা ফুলস্ক্রিন থেকে বেরোনোর সীমা আপনি লঙ্ঘন করেছেন।",
    loggingOut: "৫ সেকেন্ডের মধ্যে লগআউট হচ্ছে…",
    noQuizAvailable: "এখনো কোনো কুইজ নেই",
    noQuizTrackProgress: "নতুন কুইজ রিলিজ হলে এখানে দেখা যাবে। নিচে অগ্রগতি দেখুন।",
    checkingCompletion: "পরীক্ষা করা হচ্ছে…",
    endsLabel: "সমাপ্তি",
  },
}

function getUiLabels(lang: string) {
  return UI_LABELS[lang] ?? UI_LABELS.en
}

function getQuestionsForLanguage(
  quiz: { questions?: any[]; questionsMultiLang?: any[]; questionsByLanguage?: Record<string, any[]>; languages?: string[] },
  lang: string
): Q[] {
  if (quiz.questionsByLanguage && Object.keys(quiz.questionsByLanguage).length > 0) {
    const list = quiz.questionsByLanguage[lang] ?? quiz.questionsByLanguage[quiz.languages?.[0] ?? "en"]
    if (Array.isArray(list) && list.length > 0) {
      return list.map((q: any) => ({
        category: q.category ?? "General",
        difficulty: (q.difficulty ?? "Medium") as "Easy" | "Medium" | "Hard",
        question: String(q.question ?? "").trim(),
        options: Array.isArray(q.options) ? q.options.filter((o: any) => o != null && String(o).trim()) : [],
        correct: Number(q.correct ?? 0),
        hint: q.hint,
        explanation: q.explanation
      }))
    }
  }
  if (quiz.questionsMultiLang?.length && quiz.languages?.length) {
    const preferred = quiz.languages.includes(lang) ? lang : quiz.languages[0]
    return quiz.questionsMultiLang
      .map((mq: any) => {
        const t = mq.translations?.[preferred] ?? mq.translations?.[quiz.languages![0]]
        return t ? { category: "General", difficulty: "Medium" as const, ...t } : null
      })
      .filter(Boolean) as Q[]
  }
  return (quiz.questions ?? []).map((q: any) => ({
    category: q.category ?? "General",
    difficulty: (q.difficulty ?? "Medium") as "Easy" | "Medium" | "Hard",
    question: String(q.question ?? "").trim(),
    options: Array.isArray(q.options) ? q.options.filter((o: any) => o != null && String(o).trim()) : [],
    correct: Number(q.correct ?? 0),
    hint: q.hint,
    explanation: q.explanation
  }))
}

function QuizSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-6 gap-3">
        <div
          className="h-12 w-12 rounded-2xl border-2 border-primary border-t-transparent animate-spin"
          aria-hidden
        />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-cyan-400/80 animate-pulse text-center">
          Loading quiz…
        </p>
      </div>
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-200/80 dark:bg-white/10 rounded-3xl" />
        <div className="space-y-3">
          <div className="h-6 w-1/2 bg-slate-200/80 dark:bg-white/10 rounded-lg" />
          <div className="h-4 w-3/4 bg-slate-200/70 dark:bg-white/10 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-200/70 dark:bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function NoQuizPlaceholder() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#1a2340] font-bold">No quiz available yet. A new quiz will appear here once the admin uploads one.</p>
      <a href="/user?tab=Referrals" className="inline-flex items-center gap-2 pill bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-[#7c3aed] text-sm font-black px-4 py-2 rounded-lg transition-colors uppercase tracking-wider">
        <span>Refer & Earn</span>
      </a>
    </div>
  )
}

function getTodayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const getStorageKey = (user: string, quizType?: string) => `${QUIZ_STORAGE_KEY}_${user}_${quizType ?? "daily"}_${getTodayLocal()}`
// Legacy key (no quiz-type) for backward compatibility reads
const getLegacyStorageKey = (user: string) => `${QUIZ_STORAGE_KEY}_${user}_${getTodayLocal()}`

type StoredCompletion = {
  date: string
  user: string
  correct: number
  total: number
  totalTimeSeconds: number
  results: QuestionResult[]
  rows: { question: string; correctAnswer: string; userAnswer: string; correct: boolean; timeSeconds: number; explanation?: string }[]
  quizId?: string
}

function readCompletedFromStorage(username: string | null, quizId: string | null, quizType?: string): StoredCompletion | null {
  if (typeof window === "undefined" || !username?.trim()) return null
  try {
    // Try typed key first (daily/tournament)
    const key = getStorageKey(username.trim(), quizType)
    const raw = window.localStorage.getItem(key) || window.localStorage.getItem(getLegacyStorageKey(username.trim()))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredCompletion
    if (!parsed) return null
    // CRITICAL: If stored quizId doesn't match current quizId → new quiz released, ignore old completion
    if (quizId && parsed.quizId && parsed.quizId !== quizId) return null
    if (quizId && parsed.quizId) return parsed.quizId === quizId ? parsed : null
    if (parsed.date === getTodayLocal()) return parsed
  } catch { }
  return null
}

function clearStorageForQuiz(username: string, quizId: string | null, quizType?: string) {
  if (typeof window === "undefined" || !username?.trim()) return
  try {
    const keysToCheck = [
      getStorageKey(username.trim(), quizType),
      getLegacyStorageKey(username.trim())
    ]
    for (const key of keysToCheck) {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as StoredCompletion
      if (!parsed) continue
      const matches = quizId ? parsed.quizId === quizId : true
      if (matches) window.localStorage.removeItem(key)
    }
  } catch { }
}

function requestFullscreenCompat(el: HTMLElement | null): Promise<void> {
  if (!el) return Promise.reject()
  const req = el.requestFullscreen ?? (el as any).webkitRequestFullscreen ?? (el as any).webkitEnterFullscreen
  if (typeof req === "function") return req.call(el)
  return Promise.reject()
}

function exitFullscreenCompat(): void {
  const exit = document.exitFullscreen ?? (document as any).webkitExitFullscreen ?? (document as any).webkitCancelFullScreen
  if (typeof exit === "function") exit.call(document).catch(() => { })
}

function getFullscreenElement(): Element | null {
  return document.fullscreenElement ?? (document as any).webkitFullscreenElement ?? null
}

export default function DailyQuiz({ fullscreenContainerRef, onFullscreenChange }: { fullscreenContainerRef?: React.RefObject<HTMLDivElement | null>; onFullscreenChange?: (active: boolean) => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const notif = useNotificationsOptional()
  const { openReport } = useReport()
  const challengeParam = searchParams.get("challenge")
  const fromParam = searchParams.get("from")
  const quizIdParam = searchParams.get("quizId")?.trim() || null
  const [challengeScore, setChallengeScore] = useState<{ correct: number; total: number } | null>(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const lastHiddenAtRef = useRef<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [timerActive, setTimerActive] = useState(false)
  const [streak, setStreak] = useState(0)
  const [questions, setQuestions] = useState<Q[]>([])
  const [showDemoQuestions, setShowDemoQuestions] = useState<boolean>(false)
  const [mockExamEnabled, setMockExamEnabled] = useState(false)
  const [timePerQuestion, setTimePerQuestion] = useState(30)
  const [username, setUsername] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [paid, setPaid] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try { return localStorage.getItem("paid") === "1" } catch { }
    return false
  })
  const [enrollment, setEnrollment] = useState<{ tournamentId: string; tournamentTitle: string; uniqueCode?: string } | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const questionStartRef = useRef<number>(Date.now())
  const timedOutForIndexRef = useRef<number>(-1)
  const [results, setResults] = useState<QuestionResult[]>([])
  const [displayedQuestions, setDisplayedQuestions] = useState<Q[]>([])
  const [alreadyCompleted, setAlreadyCompleted] = useState<StoredCompletion | null>(null)
  const [completionCheckDone, setCompletionCheckDone] = useState(false)
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showXerox, setShowXerox] = useState(false)
  const [showQaModalFirst, setShowQaModalFirst] = useState(false)
  const [spinOverlayOpen, setSpinOverlayOpen] = useState(false)
  const spinOverlayUserDismissedRef = useRef(false)

  const [savingToServer, setSavingToServer] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [quizSummary, setQuizSummary] = useState<{
    correct: number
    total: number
    totalTimeSeconds: number
    results: QuestionResult[]
    rows: StoredCompletion["rows"]
    date: string
    quizId?: string
  } | null>(null)
  const [reportingIndex, setReportingIndex] = useState<number | null>(null)
  const [reportComment, setReportComment] = useState("")
  const [reportSent, setReportSent] = useState(false)
  const [hintRevealed, setHintRevealed] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [rawQuiz, setRawQuiz] = useState<{ questions?: any[]; questionsMultiLang?: any[]; questionsByLanguage?: Record<string, any[]>; languages?: string[]; endTime?: string } | null>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en")
  const [languageSelectionEnabled, setLanguageSelectionEnabled] = useState(true)
  const [quizEndTime, setQuizEndTime] = useState<string | null>(null)
  const [quizEnded, setQuizEnded] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [integrityWarnings, setIntegrityWarnings] = useState(0)
  const [showIntegrityWarning, setShowIntegrityWarning] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")
  const [rulesAgreed, setRulesAgreed] = useState(false)
  const questionEndTimeRef = useRef<number>(0)
  const questionRemainingByIndexRef = useRef<Map<number, number>>(new Map())
  const restoreTimerForRef = useRef<{ index: number; inReview: boolean } | null>(null)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set())
  const [reviewPhase, setReviewPhase] = useState(false)
  const [aiExplanations, setAiExplanations] = useState<Record<number, { loading: boolean; text?: string; error?: string }>>({})
  const [questionsToReview, setQuestionsToReview] = useState<Q[]>([])
  const [reviewResults, setReviewResults] = useState<QuestionResult[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const quizContainerRef = useRef<HTMLDivElement>(null)
  const practiceQuizPoolRef = useRef<unknown[]>([])
  const firstOptionRef = useRef<HTMLButtonElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const [anotherTabOpen, setAnotherTabOpen] = useState(false)
  const quizTabIdRef = useRef<string>(typeof window !== "undefined" ? `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` : "tab-0")
  const lastOtherTabMsgRef = useRef<number>(0)
  const quizLockSessionIdRef = useRef<string | null>(null)
  const [quizLockError, setQuizLockError] = useState<string | null>(null)
  const quizBroadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const [showZoomWarning, setShowZoomWarning] = useState(false)
  const [lastScale, setLastScale] = useState(1)
  const [sessionStolen, setSessionStolen] = useState(false)

  const [showingAiAnalysis, setShowingAiAnalysis] = useState<Set<number>>(new Set())

  const logIntegrityEvent = useCallback((type: string, reason: string, meta?: Record<string, unknown>) => {
    try {
      const fp = typeof window !== "undefined" ? getDeviceFingerprint() : "ssr"
      const merged = { ...(meta ?? {}), deviceFingerprint: fp }
      fetch("/api/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, reason, meta: merged })
      }).catch(() => { })
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (challengeParam) {
      const parts = challengeParam.split("_").map(Number)
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        setChallengeScore({ correct: parts[0], total: parts[1] })
      }
    }
  }, [challengeParam])

  useEffect(() => {
    spinOverlayUserDismissedRef.current = false
    setSpinOverlayOpen(false)
  }, [currentQuizId])

  useEffect(() => {
    const spinEligibleQuizId = (quizSummary?.quizId || alreadyCompleted?.quizId || currentQuizId) ?? ""
    const hasFinalSummary = !!(quizSummary || alreadyCompleted)
    if (showQaModalFirst || !hasFinalSummary || !spinEligibleQuizId || spinOverlayUserDismissedRef.current) return
    let cancelled = false
    fetch(`/api/user/spin?quizId=${encodeURIComponent(spinEligibleQuizId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        if (j.ok && j.canSpin) setSpinOverlayOpen(true)
      })
      .catch(() => { })
    return () => {
      cancelled = true
    }
  }, [showQaModalFirst, quizSummary?.quizId, alreadyCompleted?.quizId, currentQuizId])

  useEffect(() => {
    if (showQaModalFirst) setSpinOverlayOpen(false)
  }, [showQaModalFirst])

  useEffect(() => {
    const masterLoad = async () => {
      try {
        // Step 1: Fire all primary non-dependent requests in parallel
        const [bsRes, stRes, pbRes, usRes, blRes, pqRes] = await Promise.all([
          fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include" }),
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/stats/public", { cache: "no-store" }),
          fetch("/api/user/stats", { cache: "no-store", credentials: "include" }),
          fetch("/api/user/block", { cache: "no-store", credentials: "include" }),
          fetch("/api/practice-quiz", { cache: "no-store" })
        ])

        const [bs, st, pb, us, bl, pq] = await Promise.all([
          bsRes.json().catch(() => ({})),
          stRes.json().catch(() => ({})),
          pbRes.json().catch(() => ({})),
          usRes.json().catch(() => ({})),
          blRes.json().catch(() => ({})),
          pqRes.json().catch(() => ({}))
        ])

        practiceQuizPoolRef.current = Array.isArray(pq?.data) ? pq.data : []

        // Step 2: Extract key data
        const u = bs?.data?.username || null
        let localPaid = false
        try { if (typeof window !== "undefined") localPaid = window.localStorage.getItem("paid") === "1" } catch { }
        const isPaid = Boolean(bs?.data?.paid) || localPaid
        const tid = bs?.data?.enrollment?.tournamentId ?? null

        // Update basic state
        setUsername(u)
        setPaid(isPaid)
        setEnrollment(bs?.data?.enrollment ?? null)
        setCountry(bs?.data?.country ?? null)
        setShowDemoQuestions(Boolean(st?.data?.showDemoQuestions))
        setMockExamEnabled(Boolean(pb?.mockExamEnabled))
        setStreak(us?.data?.streak ?? 0)

        const tpq = Number(st?.data?.timePerQuestion ?? 30)
        setTimePerQuestion(Number.isFinite(tpq) && tpq >= 5 && tpq <= 120 ? tpq : 30)
        if (typeof st?.data?.languageSelectionEnabled === "boolean") {
          setLanguageSelectionEnabled(st.data.languageSelectionEnabled)
          if (!st.data.languageSelectionEnabled) setSelectedLanguage("en")
        }

        if (bl?.blocked) {
          setBlocked(true)
          setBlockReason(bl.blockReason || "Account restricted.")
          return // Stop early if blocked
        }

        // Step 3: Quiz list first, then completion for THAT quiz id (so refresh / new device / new quiz release stay correct)
        if (isPaid) {
          let quizUrl = "/api/quizzes"
          if (quizIdParam) quizUrl += `?quizId=${encodeURIComponent(quizIdParam)}`
          else if (tid) quizUrl += `?tournamentId=${encodeURIComponent(tid)}`

          const qRes = await fetch(quizUrl, { cache: "no-store" })
          const qj = await qRes.json().catch(() => ({}))
          const list = Array.isArray(qj?.data) ? qj.data : []
          const first = list[0]
          const resolvedQuizId = quizIdParam || first?.id || null

          const compUrl = resolvedQuizId
            ? `/api/quiz-completion?quizId=${encodeURIComponent(resolvedQuizId)}`
            : "/api/quiz-completion"
          const cRes = await fetch(compUrl, { cache: "no-store", credentials: "include" })
          const cj = await cRes.json().catch(() => ({}))
          // Determine quiz type: if enrolled in tournament → tournament, else daily
          const quizType = tid ? "tournament" : "daily"

          if (first) {
            setCurrentQuizId(first.id)
            setQuizEndTime(first.endTime ?? null)
            setRawQuiz(first)
            // Set language
            try {
              const savedLang = typeof window !== "undefined" ? window.sessionStorage.getItem("quiz_preferred_language") : null
              if (savedLang && (QUIZ_START_LANGUAGES as readonly string[]).includes(savedLang)) setSelectedLanguage(savedLang)
              else setSelectedLanguage("en")
            } catch { setSelectedLanguage("en") }
          } else {
            setRawQuiz(null)
            if (st?.data?.showDemoQuestions) {
              setQuestions(mapPracticeApiToQuestions(practiceQuizPoolRef.current))
            }
          }

          // Handle completion only for a known active quiz id (avoids showing old "today" completion after a new quiz ships)
          if (cj?.completed && cj?.score != null && resolvedQuizId) {
            const serverCompletion: StoredCompletion = {
              date: getTodayLocal(),
              user: u || "",
              correct: cj.score,
              total: cj.total,
              totalTimeSeconds: cj.totalTimeSeconds ?? 0,
              results: [],
              rows: Array.isArray(cj.rows) ? cj.rows : [],
              quizId: resolvedQuizId
            }
            setAlreadyCompleted(serverCompletion)
            setCompletionCheckDone(true)
          } else {
            // Server says not completed for this quiz: clear stale local entry for this quiz
            if (qRes.ok && cj?.completed === false && resolvedQuizId) clearStorageForQuiz(u || "", resolvedQuizId, quizType)
            const local = readCompletedFromStorage(u, resolvedQuizId, quizType)
            if (local) setAlreadyCompleted(local)
            setCompletionCheckDone(true)
          }
        } else {
          setCompletionCheckDone(true)
          if (st?.data?.showDemoQuestions) {
            setQuestions(mapPracticeApiToQuestions(practiceQuizPoolRef.current))
          }
        }
      } catch (err) {
        setCompletionCheckDone(true)
      } finally {
        setMounted(true)
      }
    }

    masterLoad()
  }, [quizIdParam])

  useEffect(() => {
    if (!mounted || !challengeParam || paid) return
    const qs = fromParam ? `challenge=${challengeParam}&from=${encodeURIComponent(fromParam)}` : `challenge=${challengeParam}`
    router.replace(`/intro?${qs}`)
  }, [mounted, challengeParam, fromParam, paid, router])



  const handleStartQuiz = useCallback(async () => {
    setQuizLockError(null)
    if (username) {
      let sessionId = typeof window !== "undefined" ? sessionStorage.getItem("quiz_active_session_id") : null
      if (!sessionId) {
        sessionId = `qs-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
        try { sessionStorage.setItem("quiz_active_session_id", sessionId) } catch { }
      }
      const tid = enrollment?.tournamentId || "global"
      const res = await fetch("/api/quiz/start-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tournamentId: tid,
          sessionId,
          deviceFingerprint: getDeviceFingerprint()
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!j?.ok) {
        setQuizLockError(j?.error ?? "Another browser/device is already playing this session. Please close other tabs first.")
        return
      }
      quizLockSessionIdRef.current = sessionId
    }
    if (rawQuiz) {
      const qs = getQuestionsForLanguage(rawQuiz, selectedLanguage)
      const valid = qs.filter((q) => q.question?.trim() && q.options?.length >= 2)
      if (valid.length === 0 && showDemoQuestions) {
        let pool = mapPracticeApiToQuestions(practiceQuizPoolRef.current)
        if (pool.length === 0) {
          const j = await fetch("/api/practice-quiz", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ data: [] }))
          practiceQuizPoolRef.current = Array.isArray(j?.data) ? j.data : []
          pool = mapPracticeApiToQuestions(practiceQuizPoolRef.current)
        }
        setQuestions(pool)
      } else {
        setQuestions(valid)
      }
    }
    if (currentQuizId && username && paid) {
      fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quizId: currentQuizId })
      }).catch(() => { })
    }
    setQuizStarted(true)
    setTimerActive(true)
    setIntegrityWarnings(0)
    requestAnimationFrame(() => {
      document.body.classList.add("quiz-fullscreen-active")
      const el = (fullscreenContainerRef?.current ?? document.documentElement) as HTMLElement
      requestFullscreenCompat(el).catch(() => {
        el?.classList?.add?.("quiz-fullscreen-active")
        el?.classList?.add?.("quiz-fallback-fullscreen")
      })
    })
  }, [rawQuiz, selectedLanguage, showDemoQuestions, currentQuizId, username, paid, enrollment?.tournamentId])

  const MAX_QUESTIONS_PER_ATTEMPT = 15
  const sessionSeedRef = useRef<number | null>(null)
  useEffect(() => {
    if (!questions.length) return
    if (finished || alreadyCompleted || quizSummary) return
    if (sessionSeedRef.current === null) {
      sessionSeedRef.current = seedFrom(`${enrollment?.tournamentId ?? ""}:${uid ?? "guest"}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
    }
    const seed = sessionSeedRef.current
    const seedStr = `${seed}:${questions[0]?.question ?? ""}:${questions.length}`
    const shuffledQ = seededShuffle(questions, seed).map((q) => {
      const optSeed = seedFrom(`${seedStr}:${q.question}`)
      const opts = seededShuffle(q.options, optSeed)
      const correctText = q.options[q.correct] ?? ""
      const correctIndex = Math.max(0, opts.findIndex((o) => o === correctText))
      return { ...q, options: opts, correct: correctIndex }
    })
    setQuestions(shuffledQ)
    setDisplayedQuestions(shuffledQ)
    setIndex(0)
  }, [enrollment?.tournamentId, uid, questions.length, finished, alreadyCompleted, quizSummary])

  useEffect(() => {
    const sid = quizLockSessionIdRef.current
    const tid = enrollment?.tournamentId || "global"
    if (!sid) return
    const releaseLock = () => {
      fetch("/api/quiz/end-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tournamentId: tid, sessionId: sid })
      }).catch(() => { })
      quizLockSessionIdRef.current = null
      try { sessionStorage.removeItem("quiz_active_session_id") } catch { }
    }
    if (quizSummary || finished) {
      releaseLock()
    }
    return () => {
      releaseLock()
    }
  }, [quizSummary, finished, enrollment?.tournamentId])

  useEffect(() => {
    timedOutForIndexRef.current = -1
  }, [index])

  const inReview = reviewPhase && questionsToReview.length > 0
  const current = inReview ? questionsToReview[reviewIndex] : questions[index]
  const totalQs = paid ? Math.min(MAX_QUESTIONS_PER_ATTEMPT, questions.length) : Math.min(5, questions.length)

  useEffect(() => {
    if (!quizEndTime) return
    const check = () => {
      const end = new Date(quizEndTime).getTime()
      if (Date.now() >= end) setQuizEnded(true)
    }
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [quizEndTime])

  useEffect(() => {
    if (!timerActive || !quizStarted || !current) return
    const restore = restoreTimerForRef.current
    if (restore && restore.inReview === inReview && (inReview ? restore.index === reviewIndex : restore.index === index)) {
      const key = inReview ? 1000 + reviewIndex : index
      const saved = questionRemainingByIndexRef.current.get(key)
      if (saved != null && saved > 0) {
        questionEndTimeRef.current = Date.now() + saved
      } else {
        questionEndTimeRef.current = Date.now() + timePerQuestion * 1000
      }
      restoreTimerForRef.current = null
    } else {
      questionEndTimeRef.current = Date.now() + timePerQuestion * 1000
    }
  }, [index, reviewIndex, timerActive, quizStarted, timePerQuestion, current, inReview])

  useEffect(() => {
    if (!timerActive || !quizStarted) return
    const tick = () => {
      if (document.visibilityState === "hidden") return // Don't tick if hidden
      const remaining = Math.max(0, Math.ceil((questionEndTimeRef.current - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [index, timerActive, quizStarted])

  useEffect(() => {
    const handleVisibility = () => {
      const visible = document.visibilityState === "visible"
      setTabVisible(visible)

      if (!visible) {
        lastHiddenAtRef.current = Date.now()
      } else if (lastHiddenAtRef.current) {
        // Resume: offset the question end time by how long we were hidden
        const pausedFor = Date.now() - lastHiddenAtRef.current
        questionEndTimeRef.current += pausedFor
        lastHiddenAtRef.current = null
      }

      if (!visible && quizStarted && timerActive && !finished && !blocked) {
        // Only warn if they aren't using a modern mobile browser that might lock screen
        // But for high reliability of "unfairness" fix, we let it pause without a block first
        // unless they are away for TOO long.
        setIntegrityWarnings((w) => {
          const next = w + 1
          if (next >= 3) {
            fetch("/api/user/block", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reason: "Switching tabs during quiz exceeded allowed limit (3 warnings). Stay focused on the quiz."
              }),
              credentials: "include"
            }).then(() => setBlocked(true)).catch(() => { })
          }
          logIntegrityEvent("visibility_hidden", "Tab became hidden during quiz.", { previous: w, next })
          return next
        })
        setShowIntegrityWarning(true)
      }
    }
    const handleFullscreenChange = () => {
      const inFullscreen = !!getFullscreenElement()
      if (!inFullscreen && quizStarted && timerActive && !finished && !blocked) {
        setIntegrityWarnings((w) => {
          const next = w + 1
          if (next >= 3) {
            fetch("/api/user/block", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reason: "Exiting fullscreen during quiz exceeded allowed limit (3 warnings). Stay in fullscreen to complete the quiz."
              }),
              credentials: "include"
            }).then(() => setBlocked(true)).catch(() => { })
          }
          logIntegrityEvent("fullscreen_exit", "Fullscreen exited during active quiz (visibilitychange handler).", { previous: w, next })
          return next
        })
        setShowIntegrityWarning(true)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
    }
  }, [quizStarted, timerActive, finished, blocked])

  useEffect(() => {
    if (!quizStarted || finished || blocked) return
    const handleViewportChange = () => {
      const scale = window.visualViewport?.scale ?? 1
      if (Math.abs(scale - 1) > 0.05) {
        setShowZoomWarning(true)
      }
    }
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener("resize", handleViewportChange)
      vv.addEventListener("scroll", handleViewportChange)
      return () => {
        vv.removeEventListener("resize", handleViewportChange)
        vv.removeEventListener("scroll", handleViewportChange)
      }
    }
  }, [quizStarted, finished, blocked])

  useEffect(() => {
    const active = !!(quizStarted && timerActive && !finished && !blocked)
    onFullscreenChange?.(active)
    return () => { onFullscreenChange?.(false) }
  }, [quizStarted, timerActive, finished, blocked, onFullscreenChange])

  const answered = selected !== null

  useEffect(() => {
    if (!current || quizEnded || showIntegrityWarning) return
    const t = setTimeout(() => {
      if (answered) nextButtonRef.current?.focus({ preventScroll: true })
      else firstOptionRef.current?.focus({ preventScroll: true })
    }, 80)
    return () => clearTimeout(t)
  }, [index, reviewIndex, inReview, current?.question, answered, quizEnded, showIntegrityWarning])

  useEffect(() => {
    if (!quizStarted || !timerActive || finished || blocked || showIntegrityWarning || showQaModalFirst) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const target = e.target as HTMLElement
      if (target.closest?.("input") || target.closest?.("textarea") || target.getAttribute?.("contenteditable") === "true") return
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (
        key === "f12" ||
        (ctrl && (key === "c" || key === "v" || key === "x" || key === "a" || key === "u" || key === "s" || key === "p")) ||
        (e.shiftKey && (key === "f12" || (ctrl && (key === "i" || key === "j" || key === "c"))))
      ) {
        e.preventDefault()
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        if (answered) nextButtonRef.current?.click()
        return
      }
      if (e.key >= "1" && e.key <= "4") {
        const i = e.key.charCodeAt(0) - 49
        if (current?.options?.length && i < current.options.length && !answered && !quizEnded) {
          e.preventDefault()
          setSelected(i)
          try { navigator.vibrate?.(10) } catch { }
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [quizStarted, timerActive, finished, blocked, showIntegrityWarning, showQaModalFirst, current?.options?.length, answered, quizEnded])

  useEffect(() => {
    if (typeof window === "undefined") return
    const active = quizStarted && timerActive && !finished && !blocked
    if (!active) {
      try {
        quizBroadcastChannelRef.current?.postMessage({ type: "quiz-ended" })
      } catch { }
      setAnotherTabOpen(false)
      return
    }
    const channelName = "iq-quiz-anticheat"
    const ch = new BroadcastChannel(channelName)
    quizBroadcastChannelRef.current = ch
    const myTabId = quizTabIdRef.current
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data
      if (d?.type === "quiz-active" && d?.tabId && d.tabId !== myTabId) {
        lastOtherTabMsgRef.current = Date.now()
        setAnotherTabOpen(true)
      }
      if (d?.type === "quiz-ended") setAnotherTabOpen(false)
    }
    ch.addEventListener("message", onMessage)
    const broadcast = () => {
      try { ch.postMessage({ type: "quiz-active", tabId: myTabId, ts: Date.now() }) } catch { }
    }
    broadcast()
    const interval = setInterval(broadcast, 2000)
    const clearOtherTabInterval = setInterval(() => {
      if (lastOtherTabMsgRef.current > 0 && Date.now() - lastOtherTabMsgRef.current > 5000) {
        lastOtherTabMsgRef.current = 0
        setAnotherTabOpen(false)
      }
    }, 1000)
    return () => {
      clearInterval(interval)
      clearInterval(clearOtherTabInterval)
      ch.removeEventListener("message", onMessage)
      try { ch.postMessage({ type: "quiz-ended" }) } catch { }
      ch.close()
      quizBroadcastChannelRef.current = null
    }
  }, [quizStarted, timerActive, finished, blocked])

  // [ENHANCED] Cross-Browser Heartbeat Session Lock
  useEffect(() => {
    if (typeof window === "undefined" || !username) return
    const active = quizStarted && timerActive && !finished && !blocked
    if (!active) return

    const sid = quizLockSessionIdRef.current
    const tid = enrollment?.tournamentId || "global"
    if (!sid) return

    const heartbeat = async () => {
      try {
        const res = await fetch("/api/quiz/start-lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tournamentId: tid, sessionId: sid, deviceFingerprint: getDeviceFingerprint() })
        })
        const j = await res.json().catch(() => ({}))
        if (res.status === 409 || j?.ok === false) {
          // Session mismatch: either stolen or concurrent login on another device
          setSessionStolen(true)
          setAnotherTabOpen(true)
        } else {
          setSessionStolen(false)
        }
      } catch { } // Surface network errors silently or allow retry
    }

    const interval = setInterval(heartbeat, 15000)
    return () => clearInterval(interval)
  }, [quizStarted, timerActive, finished, blocked, username, enrollment?.tournamentId])

  useEffect(() => {
    if (typeof window === "undefined") return
    const active = quizStarted && timerActive && !finished && !blocked
    if (!active || (!anotherTabOpen && !sessionStolen)) return
    const timeout = setTimeout(() => {
      if (!quizStarted || !timerActive || finished || blocked || (!anotherTabOpen && !sessionStolen)) return
      setIntegrityWarnings((w) => {
        const next = w + 1
        if (next >= 3) {
          fetch("/api/user/block", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "Quiz accessed from multiple browsers/devices simultaneously. Session integrity lost."
            }),
            credentials: "include"
          }).then(() => setBlocked(true)).catch(() => { })
        }
        logIntegrityEvent("multiple_browser_session", "Concurrent sessions detected across browsers/devices.", { previous: w, next, stolen: sessionStolen })
        return next
      })
      setShowIntegrityWarning(true)
    }, 10000)
    return () => clearTimeout(timeout)
  }, [anotherTabOpen, sessionStolen, quizStarted, timerActive, finished, blocked, logIntegrityEvent])

  useEffect(() => {
    if (typeof window === "undefined") return
    const active = quizStarted && timerActive && !finished && !blocked
    if (!active) return
    window.history.pushState({ quizLock: true }, "", window.location.href)
    const onPopState = () => {
      window.history.pushState({ quizLock: true }, "", window.location.href)
      setIntegrityWarnings((w) => {
        const next = w + 1
        if (next >= 3) {
          fetch("/api/user/block", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "Attempting to leave the quiz (e.g. back button) exceeded allowed limit (3 warnings). Complete the quiz to finish."
            }),
            credentials: "include"
          }).then(() => setBlocked(true)).catch(() => { })
        }
        logIntegrityEvent("back_button", "User attempted to use browser back during quiz.", { previous: w, next })
        return next
      })
      setShowIntegrityWarning(true)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [quizStarted, timerActive, finished, blocked])

  const total = totalQs
  const totalWithReview = total + questionsToReview.length
  const progress = useMemo(() => {
    if (total <= 0) return 0
    if (inReview) return Math.min(100, ((total + reviewIndex + 1) / totalWithReview) * 100)
    return Math.min(100, ((index + 1) / totalWithReview) * 100)
  }, [index, reviewIndex, total, totalWithReview, inReview])

  const goToPrevious = useCallback(() => {
    if (inReview) {
      if (reviewIndex > 0) {
        restoreTimerForRef.current = { index: reviewIndex - 1, inReview: true }
        setReviewIndex((i) => i - 1)
        setReviewResults((r) => {
          const last = r[r.length - 1]
          if (last?.userSelectedIndex === -1) setSkippedCount((c) => Math.max(0, c - 1))
          else setAnsweredCount((c) => Math.max(0, c - 1))
          setSelected(last?.userSelectedIndex >= 0 ? last.userSelectedIndex ?? null : null)
          return r.slice(0, -1)
        })
      }
    } else {
      if (index > 0) {
        restoreTimerForRef.current = { index: index - 1, inReview: false }
        setIndex((i) => i - 1)
        setResults((r) => {
          const last = r[r.length - 1]
          if (last) {
            if (last.userSelectedIndex === -1) setSkippedCount((c) => Math.max(0, c - 1))
            else setAnsweredCount((c) => Math.max(0, c - 1))
            setSelected(last.userSelectedIndex >= 0 ? last.userSelectedIndex : null)
          }
          return r.slice(0, -1)
        })
      }
    }
  }, [inReview, reviewIndex, index])

  const canGoPrevious = inReview ? reviewIndex > 0 : index > 0

  const advanceQuestion = useCallback(
    (timeTakenMs: number, correct: boolean, userSelectedIndex: number) => {
      const remaining = Math.max(0, questionEndTimeRef.current - Date.now())
      questionRemainingByIndexRef.current.set(index, remaining)
      setHintRevealed(false)
      if (userSelectedIndex === -1) setSkippedCount((c) => c + 1)
      else setAnsweredCount((c) => c + 1)
      const newResults: QuestionResult[] = [...results, { timeTakenMs, correct, userSelectedIndex }]
      setResults(newResults)
      setSelected(null)
      if (index >= total - 1 && !reviewPhase) {
        const correctCount = newResults.filter((r) => r.correct).length
        const totalTimeMs = newResults.reduce((s, r) => s + r.timeTakenMs, 0)
        const totalTimeSeconds = Math.round(totalTimeMs) / 1000
        const rows = displayedQuestions.slice(0, newResults.length).map((q, i) => {
          const r = newResults[i]
          const qObj = q as Q
          const correctAnswer = q.options[q.correct] ?? ""
          const userAnswer = r.userSelectedIndex >= 0 ? (q.options[r.userSelectedIndex] ?? "—") : "Skipped (timeout)"
          return {
            question: q.question,
            correctAnswer,
            userAnswer,
            correct: r.correct,
            timeSeconds: Math.round(r.timeTakenMs / 1000),
            explanation: qObj.explanation
          }
        })
        const summary = { correct: correctCount, total, totalTimeSeconds, results: newResults, rows, date: getTodayLocal(), quizId: currentQuizId ?? undefined }
        const marked = Array.from(markedForReview)
        if (marked.length > 0) {
          const toReview = marked.map((i) => displayedQuestions[i]).filter(Boolean)
          setQuestionsToReview(toReview)
          setReviewPhase(true)
          setReviewResults([])
          setReviewIndex(0)
          setIndex(-1)
          setResults(newResults)
        } else {
          setFinished(true)
          exitFullscreenCompat()
          const stored: StoredCompletion = {
            date: getTodayLocal(),
            user: username || "guest",
            correct: correctCount,
            total,
            totalTimeSeconds,
            results: newResults,
            rows,
            quizId: currentQuizId ?? undefined
          }
          setAlreadyCompleted(stored)
          const qType = enrollment?.tournamentId ? "tournament" : "daily"
          try {
            if (username?.trim()) window.localStorage.setItem(getStorageKey(username.trim(), qType), JSON.stringify(stored))
          } catch { }
          setSavingToServer(true)
          const minDelay = new Promise<void>((r) => setTimeout(r, 1500))
          const savePromise = username && paid && currentQuizId
            ? (() => {
              const item = { name: username, score: correctCount, total, totalTimeSeconds, deviceFingerprint: getDeviceFingerprint(), tournamentId: enrollment?.tournamentId, country, rows }
              return fetch("/api/leaderboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ item })
              })
                .then((r) => r.json())
                .then((lb) =>
                  fetch("/api/user/stats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      date: getTodayLocal(),
                      score: correctCount,
                      total,
                      totalTimeSeconds,
                      rank: lb?.rank,
                      quizId: currentQuizId ?? undefined,
                      rows,
                      deviceFingerprint: getDeviceFingerprint()
                    }),
                    credentials: "include"
                  })
                )
                .then((r) => r.json())
                .then((j) => setStreak(j?.data?.streak ?? 0))
            })()
            : Promise.resolve()
          Promise.all([savePromise, minDelay])
            .then(() => {
              setSaveFailed(false)
              resetBootstrapBust()
              fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include" }).then(() => {
                try { window.dispatchEvent(new CustomEvent("bootstrap-invalidate")) } catch { }
              }).catch(() => { })
              router.refresh()
              setQuizSummary(summary)
              setSavingToServer(false)
              try { sessionStorage.setItem("quiz_just_completed_ts", String(Date.now())) } catch { }
              if (correctCount / total >= 0.8) setShowConfetti(true)
            })
            .catch(() => {
              setSaveFailed(true)
              setQuizSummary(summary)
              setSavingToServer(false)
              try { sessionStorage.setItem("quiz_just_completed_ts", String(Date.now())) } catch { }
              if (correctCount / total >= 0.8) setShowConfetti(true)
            })
        }
      } else if (index < total - 1) {
        setIndex((i) => i + 1)
        questionStartRef.current = Date.now()
      }
    },
    [results, index, total, displayedQuestions, username, paid, currentQuizId, enrollment?.tournamentId, country, markedForReview, reviewPhase, streak, router, getTodayLocal, getStorageKey, setAlreadyCompleted, setFinished, setSavingToServer, setQuizSummary, setSaveFailed, setShowConfetti, setStreak]
  )

  const advanceReviewQuestion = useCallback(
    (timeTakenMs: number, correct: boolean, userSelectedIndex: number) => {
      const key = 1000 + reviewIndex
      const remaining = Math.max(0, questionEndTimeRef.current - Date.now())
      questionRemainingByIndexRef.current.set(key, remaining)
      setHintRevealed(false)
      if (userSelectedIndex === -1) setSkippedCount((c) => c + 1)
      else setAnsweredCount((c) => c + 1)
      const newReviewResults = [...reviewResults, { timeTakenMs, correct, userSelectedIndex }]
      setReviewResults(newReviewResults)
      setSelected(null)
      if (reviewIndex >= questionsToReview.length - 1) {
        const markedArr = Array.from(markedForReview)
        let correctCount = 0
        const rows: { question: string; correctAnswer: string; userAnswer: string; correct: boolean; timeSeconds: number; explanation?: string }[] = []
        for (let i = 0; i < displayedQuestions.length; i++) {
          const q = displayedQuestions[i]
          const correctAnswer = q.options[q.correct] ?? ""
          if (markedForReview.has(i)) {
            const j = markedArr.indexOf(i)
            const r = newReviewResults[j]
            const userAnswer = r.userSelectedIndex >= 0 ? (q.options[r.userSelectedIndex] ?? "—") : "Skipped"
            if (r.correct) correctCount++
            rows.push({ question: q.question, correctAnswer, userAnswer, correct: r.correct, timeSeconds: Math.round(r.timeTakenMs / 1000), explanation: (q as Q).explanation })
          } else {
            const r = results[i]
            const userAnswer = r.userSelectedIndex >= 0 ? (q.options[r.userSelectedIndex] ?? "—") : "Skipped"
            if (r.correct) correctCount++
            rows.push({ question: q.question, correctAnswer, userAnswer, correct: r.correct, timeSeconds: Math.round(r.timeTakenMs / 1000), explanation: (q as Q).explanation })
          }
        }
        const totalTimeMs = results.reduce((s, r) => s + r.timeTakenMs, 0) + newReviewResults.reduce((s, r) => s + r.timeTakenMs, 0)
        const totalTimeSeconds = Math.round(totalTimeMs) / 1000
        const mergedResults = [...results]
        markedArr.forEach((idx, j) => { mergedResults[idx] = newReviewResults[j] })
        const summary = { correct: correctCount, total, totalTimeSeconds, results: mergedResults, rows, date: getTodayLocal(), quizId: currentQuizId ?? undefined }
        setFinished(true)
        setReviewPhase(false)
        exitFullscreenCompat()
        fullscreenContainerRef?.current?.classList?.remove?.("quiz-fallback-fullscreen")
        const stored: StoredCompletion = { date: getTodayLocal(), user: username || "guest", correct: correctCount, total, totalTimeSeconds, results: mergedResults, rows, quizId: currentQuizId ?? undefined }
        setAlreadyCompleted(stored)
        const qType2 = enrollment?.tournamentId ? "tournament" : "daily"
        try {
          if (username?.trim()) window.localStorage.setItem(getStorageKey(username.trim(), qType2), JSON.stringify(stored))
        } catch { }
        setSavingToServer(true)
        const minDelay = new Promise<void>((r) => setTimeout(r, 1500))
        const savePromise = username && paid && currentQuizId
          ? fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: { name: username, score: correctCount, total, totalTimeSeconds, tournamentId: enrollment?.tournamentId, country, deviceFingerprint: getDeviceFingerprint(), rows } }) })
            .then((r) => r.json())
            .then((lb) => fetch("/api/user/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: getTodayLocal(), score: correctCount, total, totalTimeSeconds, rank: lb?.rank, quizId: currentQuizId ?? undefined, rows, deviceFingerprint: getDeviceFingerprint() }), credentials: "include" }))
            .then((r) => r.json())
            .then((j) => setStreak(j?.data?.streak ?? 0))
          : Promise.resolve()
          Promise.all([savePromise, minDelay])
            .then(() => {
              try { void triggerHapticImpact("heavy") } catch {}
              setSaveFailed(false)
              resetBootstrapBust()
              fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include" }).then(() => {
                try { window.dispatchEvent(new CustomEvent("bootstrap-invalidate")) } catch { }
              }).catch(() => { })
              router.refresh()
              setQuizSummary(summary)
              setSavingToServer(false)
              try { sessionStorage.setItem("quiz_just_completed_ts", String(Date.now())) } catch { }
              if (correctCount / total >= 0.8) {
                setShowConfetti(true)
                try {
                  const fanfare = new Audio("https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3")
                  fanfare.volume = 0.4
                  fanfare.play().catch(() => {})
                } catch {}
              }
            })
            .catch(() => {
              setSaveFailed(true)
              setQuizSummary(summary)
              setSavingToServer(false)
              try { sessionStorage.setItem("quiz_just_completed_ts", String(Date.now())) } catch { }
              if (correctCount / total >= 0.8) setShowConfetti(true)
            })
      } else {
        setReviewIndex((i) => i + 1)
        questionStartRef.current = Date.now()
      }
    },
    [reviewResults, reviewIndex, questionsToReview, results, displayedQuestions, total, username, paid, currentQuizId, enrollment?.tournamentId, country, markedForReview]
  )

  useEffect(() => {
    if (quizEnded) return
    if (secondsLeft === 0 && selected === null && current) {
      const refKey = inReview ? reviewIndex + 1000 : index
      if (timedOutForIndexRef.current !== refKey) {
        timedOutForIndexRef.current = refKey
        const timeTaken = Date.now() - questionStartRef.current
        if (inReview) advanceReviewQuestion(timeTaken, false, -1)
        else advanceQuestion(timeTaken, false, -1)
      }
    }
  }, [secondsLeft, selected, current, index, reviewIndex, inReview, advanceQuestion, advanceReviewQuestion, quizEnded])

  useEffect(() => {
    if (!blocked) return
    const t = setTimeout(() => performLogout(), 5000)
    return () => clearTimeout(t)

  }, [blocked])

  const handleExitFullscreenClick = () => {
    if (!quizStarted || !timerActive || finished || blocked) return
    logIntegrityEvent("fullscreen_exit_button", "User clicked the exit fullscreen button during quiz.")
    setIntegrityWarnings((w) => {
      const next = w + 1
      if (next >= 3) {
        fetch("/api/user/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "Exiting or attempting to exit the quiz exceeded allowed limit (3 warnings). Complete the quiz to finish."
          }),
          credentials: "include"
        }).then(() => setBlocked(true)).catch(() => { })
      }
      logIntegrityEvent("warning_increment", "Integrity warning incremented from exit fullscreen button.", { previous: w, next })
      return next
    })
    setShowIntegrityWarning(true)
  }

  const handleFinishReviewEarly = () => {
    setReviewPhase(false)
    setFinished(true)
    exitFullscreenCompat()
  }

  const handleAskAi = async (row: any, i: number) => {
    setShowingAiAnalysis(prev => new Set(prev).add(i))
    if (aiExplanations[i]?.text) return
    setAiExplanations(prev => ({ ...prev, [i]: { loading: true, error: "" } }))
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: row.question,
          userAnswer: row.userAnswer,
          correctAnswer: row.correctAnswer,
          explanation: row.explanation
        })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed")
      setAiExplanations(prev => ({ ...prev, [i]: { loading: false, text: data.text } }))
    } catch (err: any) {
      setAiExplanations(prev => ({ ...prev, [i]: { loading: false, error: err.message } }))
    }
  }

  const handleDownload = () => {
    const data = quizSummary ?? alreadyCompleted
    if (!data) return
    setShowXerox(true)
    setDownloading(true)
  }

  const handleXeroxComplete = async () => {
    const data = quizSummary ?? alreadyCompleted
    let rows = data?.rows ?? []
    let score = data?.correct ?? 0
    let total = data?.total ?? 0
    let totalTimeSeconds = data?.totalTimeSeconds ?? 0
    const quizIdForReport = currentQuizId ?? alreadyCompleted?.quizId
    if (rows.length === 0 && quizIdForReport) {
      try {
        const r = await fetch(`/api/quiz-completion/report?quizId=${encodeURIComponent(quizIdForReport)}`, { credentials: "include" })
        const j = await r.json().catch(() => ({}))
        if (r.ok && j?.ok && Array.isArray(j?.rows)) {
          rows = j.rows
          score = j.score ?? score
          total = j.total ?? total
          totalTimeSeconds = j.totalTimeSeconds ?? totalTimeSeconds
        }
      } catch { }
    }
    if (rows.length > 0) {
      generateQuizPdf(rows, score, total, totalTimeSeconds, username || "Guest", selectedLanguage)
    }
    setDownloading(false)
    setShowXerox(false)
  }

  const handleRetrySync = useCallback(() => {
    const data = quizSummary ?? alreadyCompleted
    if (!data || !username || !paid) return
    const item: { name: string; score: number; total?: number; totalTimeSeconds?: number; tournamentId?: string; country?: string } = {
      name: username,
      score: data.correct,
      total: data.total,
      totalTimeSeconds: data.totalTimeSeconds
    }
    if (enrollment?.tournamentId) item.tournamentId = enrollment.tournamentId
    if (country) item.country = country
      ; (item as Record<string, unknown>).deviceFingerprint = getDeviceFingerprint()
    fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: { ...item, rows: data.rows } }) })
      .then((r) => r.json())
      .then((lb) =>
        fetch("/api/user/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: getTodayLocal(),
            score: data.correct,
            total: data.total,
            totalTimeSeconds: data.totalTimeSeconds,
            rank: lb?.rank,
            quizId: (currentQuizId as string) || undefined,
            rows: data.rows,
            deviceFingerprint: getDeviceFingerprint()
          }),
          credentials: "include"
        })
      )
      .then((r) => r.json())
      .then((j) => {
        setStreak(j?.data?.streak ?? 0)
        setSaveFailed(false)
        resetBootstrapBust()
        fetch(getBootstrapUrl(), { cache: "no-store", credentials: "include" }).then(() => {
          try { window.dispatchEvent(new CustomEvent("bootstrap-invalidate")) } catch { }
        }).catch(() => { })
        router.refresh()
      })
      .catch(() => { })
  }, [quizSummary, alreadyCompleted, username, paid, enrollment?.tournamentId, country, currentQuizId, router])

  if (finished && savingToServer) {
    return (
      <div ref={quizContainerRef} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-8">
        <div className="card p-12 max-w-sm text-center border border-white/10 bg-[#020617] shadow-black shadow-2xl relative overflow-hidden group">
          {/* Pulsing glow */}
          <div className="absolute inset-0 bg-primary/5 animate-pulse-slow" />
          
          <div className="relative z-10">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/20 blur-xl animate-pulse" />
                <RocketIcon size={48} className="text-primary animate-bounce" />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Syncing Results</h2>
            <p className="text-sm text-white/50 mb-8 font-medium">Validating performance data with the main server instance...</p>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 px-0.5 flex items-center mb-4">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,1)]"
              />
            </div>
            
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // UNIFIED COMPLETION VIEW (Premium redesign)
  const finalSummary = quizSummary || alreadyCompleted
  if (mounted && finalSummary) {
    const t = getUiLabels(selectedLanguage)
    const correctPct = finalSummary.total > 0 ? Math.round((finalSummary.correct / finalSummary.total) * 100) : 0
    const scoreColor = correctPct >= 80 ? "#10b981" : correctPct >= 50 ? "#f59e0b" : "#ef4444"
    const isNewQuizAvailable = currentQuizId && finalSummary.quizId && currentQuizId !== finalSummary.quizId

    // REVIEW MODAL - shown immediately after quiz
    if (showQaModalFirst) {
      return (
        <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center bg-black/55 backdrop-blur-md p-0 sm:p-4 overflow-y-auto overflow-x-hidden w-full min-h-[100dvh] animate-fade">
          <div className="w-full max-w-2xl min-h-0 h-full sm:h-auto sm:max-h-[min(85vh,100dvh)] overflow-hidden flex flex-col bg-white border-0 sm:border border-[#e8eaf0] shadow-2xl relative sm:rounded-3xl my-auto">
            {/* Review Header */}
            <div className="relative shrink-0 px-6 pt-6 pb-4 text-center border-b border-[#e8eaf0]" style={{ background: `linear-gradient(135deg, ${scoreColor}08 0%, transparent 80%)` }}>
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: scoreColor }} />
              <button type="button" onClick={() => setShowQaModalFirst(false)} className="absolute top-4 right-4 z-[110] w-9 h-9 rounded-2xl bg-[#f1f5f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-[#1a2340] transition-all border border-[#e8eaf0] active:scale-90"><XIcon size={16} /></button>
              <div className="text-[9px] font-black tracking-[0.25em] text-[#64748b]/40 uppercase mb-3">Question-by-Question Review</div>
              <div className="flex items-center justify-center gap-5">
                <svg width="68" height="68" viewBox="0 0 72 72" className="shrink-0">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke={scoreColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${correctPct * 1.885} 188.5`} transform="rotate(-90 36 36)" style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                  <text x="36" y="36" textAnchor="middle" dominantBaseline="central" fill="#1a2340" fontSize="16" fontWeight="900">{correctPct}%</text>
                </svg>
                <div className="text-left">
                  <div className="text-xl font-black text-[#1a2340]">{finalSummary.correct} <span className="text-sm text-[#64748b] font-bold">/ {finalSummary.total} correct</span></div>
                  <div className="text-[10px] text-[#64748b]/60 uppercase tracking-widest font-black mt-1">⏱ {Number(finalSummary.totalTimeSeconds).toFixed(1)}s total time</div>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto scrollbar-hidden p-4 sm:p-6 space-y-3">
              {(finalSummary.rows?.length ?? 0) === 0 && (
                <div className="py-12 text-center text-[#64748b] font-bold text-sm">No question data available for review.</div>
              )}
              {finalSummary.rows?.map((row, i) => (
                <div key={i} className={`group rounded-2xl border transition-all ${row.correct ? "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50" : "bg-red-50 border-red-100 hover:bg-red-100/50"}`}>
                  {/* Question Row */}
                  <div className="p-4 flex items-start gap-3">
                    <span className={`shrink-0 mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${row.correct ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-red-500 text-white shadow-lg shadow-red-500/20"}`}>
                      {row.correct ? <CheckIcon size={14} /> : <XIcon size={14} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[#1a2340] leading-snug">
                        <span className="text-[10px] font-black text-[#64748b]/40 mr-1.5">{i + 1}.</span>{row.question}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg ${row.correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {row.correct ? "✓" : "✗"} {row.userAnswer}
                        </span>
                        {!row.correct && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                            ✓ {row.correctAnswer}
                          </span>
                        )}
                      </div>
                      {row.explanation && !showingAiAnalysis.has(i) && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-[#7c3aed] bg-blue-50 rounded-xl px-3 py-2 border-l-2 border-[#7c3aed]">
                          <LightbulbIcon size={12} className="mt-0.5 shrink-0 text-[#7c3aed]" />
                          <span className="italic leading-relaxed">{row.explanation}</span>
                        </div>
                      )}
                      {showingAiAnalysis.has(i) && (
                        <div className="mt-2 rounded-xl bg-[#f8fafc] border border-[#e8eaf0] p-3 relative animate-fade">
                          <button onClick={() => setShowingAiAnalysis(prev => { const n = new Set(prev); n.delete(i); return n })} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-[#1a2340] transition-all"><XIcon size={10} /></button>
                          <div className="text-[9px] uppercase font-black text-[#7c3aed] flex items-center gap-1 mb-1.5"><BotIcon size={10} /> AI Tutor Explanation</div>
                          {aiExplanations[i]?.loading ? (
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-[#7c3aed] border-t-transparent animate-spin" /><span className="text-xs text-[#64748b]">Analyzing…</span></div>
                          ) : aiExplanations[i]?.error ? (
                            <p className="text-xs text-red-500">{aiExplanations[i].error}</p>
                          ) : (
                            <p className="text-xs text-[#1a2340] leading-relaxed">{aiExplanations[i]?.text}</p>
                          )}
                        </div>
                      )}
                      {!row.correct && !showingAiAnalysis.has(i) && (
                        <button type="button" onClick={() => handleAskAi(row, i)} disabled={aiExplanations[i]?.loading} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[10px] font-black text-[#7c3aed] border border-blue-100 hover:bg-blue-100 transition-all disabled:opacity-40 uppercase tracking-wide">
                          {aiExplanations[i]?.loading ? <span className="animate-pulse">Analyzing…</span> : <><BotIcon size={11} /> Ask AI Why</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 border-t border-[#e8eaf0] bg-[#f8fafc]">
              <button type="button" onClick={() => setShowQaModalFirst(false)} className="w-full h-13 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-base hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-wide">
                ✓ Close Review & See Results
              </button>
            </div>
          </div>
        </div>
      )
    }

    // RESULTS SUMMARY MODAL
    return (
      <div ref={quizContainerRef} className="fixed inset-0 z-[110] flex items-stretch sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-5 overflow-y-auto overflow-x-hidden w-full min-h-[100dvh] animate-fade">
        {quizSummary && showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

        <div className="w-full max-w-4xl min-h-0 h-full sm:h-auto sm:max-h-[min(92vh,100dvh)] overflow-hidden flex flex-col bg-white border-0 sm:border border-[#e8eaf0] shadow-2xl relative sm:rounded-[2.5rem] my-auto">

          {/* Premium Header */}
          <div className="shrink-0 relative overflow-hidden px-8 pt-8 pb-6 text-center border-b border-[#e8eaf0]" style={{ background: `linear-gradient(135deg, ${scoreColor}08 0%, transparent 70%)` }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: scoreColor }} />
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5" style={{ background: scoreColor, filter: "blur(40px)" }} />

            <div className="flex items-center justify-between mb-5">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#64748b]/40">Official Result</span>
              <span className="text-[9px] font-black text-[#64748b]/40 tracking-wider">{finalSummary.date}</span>
            </div>

            {/* Animated Score Ring & Quick Stats */}
            <div className="flex items-center justify-center gap-10 mb-2">
              <div className="relative">
                <svg width="72" height="72" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                  <circle cx="48" cy="48" r="40" fill="none" stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${correctPct * 2.513} 251.3`} transform="rotate(-90 48 48)"
                    style={{ transition: "stroke-dasharray 1.8s cubic-bezier(0.16, 1, 0.3, 1)", filter: `drop-shadow(0 0 6px ${scoreColor}15)` }} />
                  <text x="48" y="44" textAnchor="middle" dominantBaseline="central" fill="#1a2340" fontSize="18" fontWeight="900">{correctPct}%</text>
                  <text x="48" y="62" textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize="8" fontWeight="900">ACCURACY</text>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-3xl font-black" style={{ color: scoreColor }}>{finalSummary.correct}<span className="text-lg text-[#64748b]/30 font-bold">/{finalSummary.total}</span></div>
                <div className="text-[9px] text-[#64748b] font-black uppercase tracking-widest mt-0.5">Questions Correct</div>
                <div className="text-[9px] text-[#64748b]/60 font-black mt-0.5">⏱ {Number(finalSummary.totalTimeSeconds).toFixed(1)}s timing</div>
                {enrollment?.tournamentId && (
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-700 uppercase tracking-wide">
                    🏆 Tournament Quiz
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-base font-black text-[#1a2340] uppercase tracking-tighter italic">{t.quizCompleted}</h2>
          </div>

          {/* Scrollable Content - Expanded View */}
          <div className="flex-1 overflow-y-auto scrollbar-hidden overscroll-contain px-8 py-6 space-y-6">

            {/* New Quiz Available Banner */}
            {isNewQuizAvailable && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3 animate-pulse-slow">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <RocketIcon size={18} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-black text-emerald-700">New Quiz Available!</div>
                  <p className="text-xs text-[#64748b] font-bold mt-0.5">A new quiz has been released. Refresh to take it!</p>
                </div>
                <button onClick={() => window.location.reload()} className="ml-auto shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-all active:scale-95">
                  Refresh
                </button>
              </div>
            )}

            {/* Performance Insight */}
            <div className="p-5 rounded-2xl border relative overflow-hidden" style={{ background: `${scoreColor}08`, borderColor: `${scoreColor}20` }}>
              <div className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2 flex items-center gap-1.5 text-[#1a2340]">
                <LightbulbIcon size={10} /> Performance Analysis
              </div>
              <p className="text-sm leading-relaxed font-bold italic text-[#1a2340]/80">
                {finalSummary.total > 0 && finalSummary.correct / finalSummary.total === 1
                  ? "🌟 Perfect score! You have mastered this topic completely. Exceptional!"
                  : finalSummary.total > 0 && finalSummary.correct / finalSummary.total >= 0.8
                    ? "🎯 Excellent! You've demonstrated high proficiency. Solid performance!"
                    : finalSummary.total > 0 && finalSummary.correct / finalSummary.total >= 0.5
                      ? "📈 Good progress! Review the missed questions below to level up."
                      : "💪 Keep going! Every attempt builds your knowledge. Review and retry!"}
              </p>
            </div>

            {saveFailed && (
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
                <p className="text-red-700 text-xs font-bold mb-3">{t.scoreCouldntSync}</p>
                <button type="button" onClick={handleRetrySync} className="h-10 px-6 rounded-xl bg-red-500 text-white text-xs font-black shadow-lg hover:bg-red-600 transition-all uppercase tracking-widest">Retry Sync</button>
              </div>
            )}

            {/* Progress Bar */}
            <div className="pt-2">
              <QuizLaunchProgressBar />
            </div>
          </div>

          {/* Sticky Footer Buttons */}
          <div className="shrink-0 p-5 border-t border-[#e8eaf0] bg-[#f8fafc] space-y-2.5 shadow-sm">
            <button onClick={handleDownload} disabled={downloading} className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-black text-base shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2.5 uppercase tracking-wide">
              {downloading ? "⏳ Preparing..." : <><DownloadIcon size={18} /> Download Report</>}
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setShowQaModalFirst(true)} className="h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#7c3aed] font-black text-xs hover:bg-blue-100 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5">
                <FileTextIcon size={13} /> Review Q&A
              </button>
              <button type="button" onClick={() => {
                const text = encodeURIComponent(`🏆 IQ Earners Quiz Result!\n\nScore: ${finalSummary.correct}/${finalSummary.total} (${correctPct}%)\nTime: ${finalSummary.totalTimeSeconds.toFixed(1)}s\n\nCan you beat my score? 💰\nhttps://www.iqearners.online`)
                window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank")
              }} className="h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-xs hover:bg-emerald-100 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5">
                🔗 Share Score
              </button>
            </div>
          </div>
        </div>

        {showXerox && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-xl p-8">
            <div className="card p-12 max-w-md border border-white/10 bg-[#020617] shadow-black shadow-2xl">
              <XeroxDownloadAnimation onComplete={handleXeroxComplete} />
            </div>
          </div>
        )}

        {(alreadyCompleted?.quizId || currentQuizId) && (
          <QuizSpinWheelOverlay
            quizId={(alreadyCompleted?.quizId || currentQuizId)!}
            open={spinOverlayOpen}
            onDismissWithoutSpin={() => {
              spinOverlayUserDismissedRef.current = true
              setSpinOverlayOpen(false)
              const id = (alreadyCompleted?.quizId || currentQuizId) || ""
              if (id) {
                try {
                  localStorage.setItem(PENDING_SPIN_LS, id)
                } catch { }
              }
              notif?.addNotification(
                "You have an active Spin & Win reward. Open your dashboard to use it.",
                "spin",
                "/user?highlight=spin"
              )
            }}
            onCompleted={() => {
              spinOverlayUserDismissedRef.current = true
              setSpinOverlayOpen(false)
              try {
                localStorage.removeItem(PENDING_SPIN_LS)
              } catch { }
            }}
          />
        )}
      </div>
    )
  }

  const submitReport = async (rowIndex: number) => {
    const data = quizSummary ?? alreadyCompleted
    const row = data?.rows?.[rowIndex]
    if (!row) return
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: row.question,
        correctAnswer: row.correctAnswer,
        userAnswer: row.userAnswer,
        comment: reportComment,
        questionIndex: rowIndex
      }),
      credentials: "include"
    })
    if (res.ok) {
      setReportSent(true)
      setReportingIndex(null)
      setReportComment("")
    }
  }

  const hasMultiLang = rawQuiz?.questionsMultiLang?.length && rawQuiz?.languages?.length
  const languagesForSelector = QUIZ_START_LANGUAGES
  const showLanguageSelector = rawQuiz && !quizStarted && languageSelectionEnabled
  const rulesText = (rawQuiz as any)?.rules?.[selectedLanguage] ?? (rawQuiz as any)?.rules?.[rawQuiz?.languages?.[0] ?? "en"] ?? DEFAULT_RULES[selectedLanguage] ?? DEFAULT_RULES.en

  if (!mounted) {
    return (
      <div className="rounded-3xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-cyan-400/85 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" aria-hidden />
          Preparing quiz
        </div>
        <QuizSkeleton />
      </div>
    )
  }

  if (blocked) {
    const t = getUiLabels(selectedLanguage)
    return (
      <div ref={quizContainerRef} className="space-y-6 animate-fade">
        <div className="card p-8 max-w-md mx-auto text-center border-2 border-amber-500/50">
          <div className="flex justify-center mb-4"><AlertIcon size={48} className="text-amber-500" /></div>
          <div className="text-2xl font-bold text-amber-400">{t.accountBlocked}</div>
          <p className="mt-4 text-white/80">{blockReason || t.exceededLimit}</p>
          <p className="mt-4 text-sm text-amber-400">{t.loggingOut}</p>
        </div>
      </div>
    )
  }

  if (mounted && paid && !rawQuiz && questions.length === 0 && !alreadyCompleted && !showDemoQuestions) {
    const t = getUiLabels(selectedLanguage)
    return (
      <div ref={quizContainerRef} className="space-y-6 animate-fade">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white">{t.noQuizAvailable}</h2>
          <p className="text-sm text-white/60 mt-1">{t.noQuizTrackProgress}</p>
        </div>
        <QuizLaunchProgressBar />
      </div>
    )
  }

  if (paid && rawQuiz && !quizStarted && !completionCheckDone) {
    const t = getUiLabels(selectedLanguage)
    return (
      <div ref={quizContainerRef} className="space-y-6 animate-fade">
        <div className="card p-8 text-center max-w-md mx-auto">
          <div className="text-xl font-semibold text-primary">{(t as Record<string, string>).checkingCompletion ?? "Checking completion…"}</div>
          <p className="mt-2 text-sm text-white/60">Please wait…</p>
          <div className="mt-6 flex justify-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    )
  }

  if (rawQuiz && !quizStarted) {
    const endMs = quizEndTime ? new Date(quizEndTime).getTime() : 0
    const ended = endMs > 0 && Date.now() >= endMs
    const t = getUiLabels(selectedLanguage)
    return (
      <div ref={quizContainerRef} className="space-y-4 animate-fade max-w-3xl mx-auto px-2">
        <div className="paper-container rounded-2xl p-4 sm:p-6 shadow-xl animate-slide-up border-none overflow-hidden relative">
          {/* Paper grain */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-20 dark:opacity-[0.06] pointer-events-none" />

          <div className="relative z-10">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-400/30 text-amber-800 dark:text-amber-200 text-[9px] font-bold uppercase tracking-widest">
                  Official IQ Challenge
                </div>
                <h2 className="text-xl sm:text-2xl font-black ink-text leading-tight mt-1">{t.readyToStart}</h2>
              </div>
              {/* Inline Stats */}
              <div className="flex gap-2 shrink-0">
                <div className="text-center px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/25">
                  <div className="text-[8px] ink-subtext uppercase font-black tracking-wider opacity-60">Time</div>
                  <div className="text-lg font-black ink-text leading-none">{timePerQuestion}s</div>
                </div>
                <div className="text-center px-3 py-2 rounded-xl bg-blue-50 dark:bg-slate-800/80 border border-blue-200 dark:border-cyan-500/25">
                  <div className="text-[8px] ink-subtext uppercase font-black tracking-wider opacity-60">Qs</div>
                  <div className="text-lg font-black ink-text leading-none">{totalQs}</div>
                </div>
              </div>
            </div>

            {/* Language Selector - compact */}
            {showLanguageSelector && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5">
                  {languagesForSelector.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang)
                        try { window.sessionStorage.setItem("quiz_preferred_language", lang) } catch { }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedLanguage === lang ? "bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-100 border border-amber-400 dark:border-amber-400/50 shadow-sm" : "bg-white/60 dark:bg-slate-800/60 text-amber-700/60 dark:text-amber-200/70 border border-amber-100 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-500/40"}`}
                    >
                      {LANG_NAMES[lang] ?? lang}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rules - compact horizontal row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 paper-card p-3 rounded-xl flex gap-3 bg-white/40 dark:bg-slate-900/50">
                <CheckIcon size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] ink-text leading-snug font-medium line-clamp-3">{rulesText}</p>
              </div>
              <div className="sm:w-56 paper-card p-3 rounded-xl bg-red-50/50 dark:bg-red-950/30 border-red-100 dark:border-red-500/20 space-y-1">
                <div className="text-[10px] font-bold red-ink uppercase tracking-tight flex items-center gap-1.5">
                  <AlertIcon size={14} className="text-red-600" /> {t.focusFullscreen}
                </div>
                <p className="text-[10px] ink-subtext font-medium leading-snug">• {t.doNotSwitchTabs}</p>
                <p className="text-[10px] red-ink font-bold leading-snug">• {t.threeWarningsBlocked}</p>
              </div>
            </div>

            {/* Agreement + Start - single row */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group flex-1 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/25 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all select-none">
                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                  <input
                    type="checkbox"
                    checked={rulesAgreed}
                    onChange={(e) => setRulesAgreed(e.target.checked)}
                    className="peer appearance-none w-5 h-5 rounded border-2 border-amber-300 dark:border-amber-500/50 bg-white dark:bg-slate-900 checked:bg-amber-600 checked:border-amber-600 transition-all cursor-pointer"
                  />
                  <CheckIcon size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-[10px] font-bold ink-text opacity-70 group-hover:opacity-100 leading-snug">{t.agreeCheckbox}</span>
              </label>

              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={ended || !rulesAgreed}
                className="w-full sm:w-auto shrink-0 relative group overflow-hidden inline-flex items-center justify-center gap-3 rounded-xl start-quiz-btn-classic px-8 py-3.5 text-base font-black shadow-lg disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition-transform"
              >
                <span className="relative z-10 tracking-tight">
                  {ended ? t.quizEndedBtn : rulesAgreed ? t.startQuiz : t.agreeToStart}
                </span>
                {!ended && rulesAgreed && (
                  <div className="relative z-10 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <RocketIcon size={16} className="text-amber-400" />
                  </div>
                )}
              </button>
            </div>

            {/* End time / lock error */}
            {quizEndTime && !ended && (
              <div className="mt-3 flex items-center gap-2 text-[10px] ink-subtext font-bold opacity-50">
                <TimerIcon size={12} /> {t.endsLabel}: {new Date(quizEndTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </div>
            )}
            {quizEndTime && ended && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 text-red-700 border border-red-200 text-xs font-bold animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" /> {t.quizHasEnded}
              </div>
            )}
            {quizLockError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-xs font-medium flex items-center gap-2">
                <AlertIcon size={14} /> {quizLockError}
              </div>
            )}
            {enrollment?.uniqueCode && (
              <div className="mt-3 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 ink-text">
                  <span className="opacity-60">Code:</span>
                  <span className="font-mono font-black text-blue-700 tracking-wider">{enrollment.uniqueCode}</span>
                </div>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg bg-white border border-blue-200 text-blue-600 font-bold text-[10px] hover:bg-blue-600 hover:text-white transition-all"
                  onClick={() => navigator.clipboard?.writeText(enrollment.uniqueCode ?? "")}
                >
                  COPY
                </button>
              </div>
            )}
          </div>
        </div>

        {mockExamEnabled && !ended && (
          <div className="paper-container rounded-2xl p-4 border-none shadow-inner bg-gradient-to-br from-emerald-50 to-white relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex-1">
                <div className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-800 uppercase tracking-widest">Premium</div>
                <h3 className="font-black ink-text text-base mt-1">Mock Exam</h3>
              </div>
              <a
                href="/mock-exam"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-all shadow-md text-xs uppercase tracking-wider"
              >
                Start
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (questions.length > 0 && !quizStarted) {
    const t = getUiLabels(selectedLanguage)
    return (
      <div ref={quizContainerRef} className="space-y-4 animate-fade max-w-2xl mx-auto px-2">
        <div className="paper-container rounded-[2.5rem] p-8 sm:p-12 shadow-2xl animate-slide-up border-none overflow-hidden relative">
          {/* Paper grain overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.15] dark:opacity-[0.06] pointer-events-none" />
          <div className="absolute top-0 right-0 p-6 opacity-10 dark:opacity-20">
            <div className="w-16 h-16 rounded-full border-4 border-black dark:border-white/40 animate-spin-slow" />
          </div>

          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 dark:border-amber-400/30 text-amber-800 dark:text-amber-200 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
              Evaluation Sector
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-black ink-text leading-tight mb-4 tracking-tighter">
              {t.practiceQuiz}
            </h2>
            
            <p className="text-sm sm:text-base font-bold ink-subtext italic mb-10 decoration-amber-500/20 dark:decoration-amber-400/30 underline underline-offset-8">
              {t.youHaveQuestions.replace("{n}", String(questions.length))}
            </p>

            {/* Rules Board */}
            <div className="rounded-3xl bg-amber-50/60 dark:bg-amber-950/35 border-2 border-amber-100 dark:border-amber-500/25 p-6 text-left mb-8 shadow-inner">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-black uppercase text-xs tracking-widest mb-4">
                <AlertIcon size={18} /> {t.focusFullscreen}
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm font-bold ink-text opacity-80">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {t.quizOpensFullscreen}
                </li>
                <li className="flex items-start gap-3 text-sm font-bold ink-text opacity-80">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {t.doNotSwitchTabs}
                </li>
                <li className="flex items-start gap-3 text-sm font-black text-red-700 dark:text-red-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  {t.threeWarningsBlocked}
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <label className="flex items-center gap-4 cursor-pointer group mx-auto w-fit p-4 rounded-2xl border-2 border-transparent hover:border-amber-200 dark:hover:border-amber-500/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/25 transition-all">
                <div className="relative flex items-center justify-center w-6 h-6">
                  <input
                    type="checkbox"
                    checked={rulesAgreed}
                    onChange={(e) => setRulesAgreed(e.target.checked)}
                    className="peer appearance-none w-6 h-6 rounded-lg border-2 border-amber-300 dark:border-amber-500/50 bg-white dark:bg-slate-900 checked:bg-amber-600 checked:border-amber-600 transition-all cursor-pointer"
                  />
                  <CheckIcon size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs sm:text-sm font-black ink-text opacity-70 group-hover:opacity-100 text-left transition-opacity">{t.agreeCheckbox}</span>
              </label>

              {quizLockError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-500/30 text-red-700 dark:text-red-200 text-sm font-black animate-shake">
                  ⚠ {quizLockError}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartQuiz}
                disabled={!rulesAgreed}
                className="group relative inline-flex items-center justify-center gap-4 rounded-2xl bg-black dark:bg-slate-100 px-10 py-5 text-lg font-black text-white dark:text-slate-900 shadow-2xl hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-widest overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 group-hover:text-black dark:group-hover:text-slate-900 transition-colors">{rulesAgreed ? t.startQuiz : t.agreeToStart}</span>
                <RocketIcon size={24} className="relative z-10 text-amber-400 group-hover:text-black dark:group-hover:text-slate-900 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // RESULTS UNIFIED ABOVE


  return (
    <div ref={quizContainerRef} className="fixed inset-0 z-[50] flex flex-col bg-[#f3f5fb] dark:bg-[#0b1220] overflow-hidden animate-fade h-[100dvh] w-full text-slate-900 dark:text-slate-100">
      {/* Integrity & Status Overlays */}
      <NotificationBanner />
      {/* Final 10s Alert Overlay */}
      {secondsLeft <= 10 && secondsLeft > 0 && !finished && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="fixed inset-0 z-[1] pointer-events-none border-[20px] border-red-500/30 blur-2xl"
        />
      )}

      {quizStarted && timerActive && !finished && !blocked && (
        <button
          type="button"
          onClick={handleExitFullscreenClick}
          className="fixed top-3 right-3 z-[110] w-11 h-11 rounded-full bg-white dark:bg-slate-800 hover:bg-[#f1f5f9] dark:hover:bg-slate-700 active:scale-95 border border-[#e8eaf0] dark:border-white/10 flex items-center justify-center text-[#64748b] dark:text-slate-300 shadow-xl transition-all touch-manipulation"
          aria-label="Exit fullscreen"
        >
          <XIcon size={20} />
        </button>
      )}

      {(anotherTabOpen || sessionStolen) && !finished && !blocked && (
        <div className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-xl flex items-center justify-center p-6 text-center animate-fade">
          <div className="max-w-sm space-y-6">
            <div className={`w-20 h-20 rounded-3xl ${sessionStolen ? "bg-amber-50 border-amber-200 shadow-amber-100" : "bg-red-50 border-red-200 shadow-red-100"} border flex items-center justify-center mx-auto animate-pulse shadow-xl`}>
              <AlertIcon size={40} className={sessionStolen ? "text-amber-600" : "text-red-600"} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#1a2340]">{sessionStolen ? "Session Conflict" : "Multiple Tabs Detected"}</h2>
              <p className="text-[#64748b] leading-relaxed font-black">
                {sessionStolen
                  ? "Another browser or device has claimed this quiz session. To prevent cheating, only one active session is allowed per user name."
                  : "The quiz is active in another window. Close this tab or the other one to continue. Any progress may be lost if you switch tabs."}
              </p>
            </div>
            {sessionStolen && (
              <button
                onClick={() => window.location.reload()}
                className="w-full h-12 rounded-xl bg-amber-500 text-white font-black text-sm hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                Try Reconnect
              </button>
            )}
          </div>
        </div>
      )}

      {showIntegrityWarning && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-white/95 backdrop-blur-md p-6 animate-fade" onClick={() => setShowIntegrityWarning(false)}>
          <div className="card p-8 max-w-sm text-center animate-pop border border-[#e8eaf0] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6 transform rotate-12">
              <AlertIcon size={32} className="text-amber-600" />
            </div>
            <h3 className="text-2xl font-black text-[#1a2340] mb-3">Integrity Notice</h3>
            <p className="text-[#64748b] font-black mb-6 leading-relaxed">You switched tabs or exited fullscreen. Please focus on the quiz. Multiple violations will result in an account block.</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e8eaf0]">
                <div className="text-[10px] uppercase font-black text-[#64748b]/40 mb-1">Warnings</div>
                <div className={`text-xl font-black ${integrityWarnings >= 2 ? "text-red-500" : "text-amber-600"}`}>{integrityWarnings}/3</div>
              </div>
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e8eaf0]">
                <div className="text-[10px] uppercase font-black text-[#64748b]/40 mb-1">Status</div>
                <div className="text-xs font-black text-[#1a2340] uppercase tracking-widest">Active</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowIntegrityWarning(false)
                if (integrityWarnings < 3) {
                  const el = fullscreenContainerRef?.current ?? document.documentElement
                  requestFullscreenCompat(el).catch(() => el?.classList?.add("quiz-fallback-fullscreen"))
                }
              }}
              className="w-full h-14 rounded-2xl bg-[#7c3aed] text-white font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-wide"
            >
              Resume Session
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="w-full shrink-0 z-[100] bg-white border-b border-[#e8eaf0] shadow-sm dark:bg-slate-900 dark:border-white/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-4 gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center border border-[#7c3aed]/20 shrink-0">
                <RocketIcon size={20} className="text-[#7c3aed]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748b]/40 truncate max-w-[120px]">
                  {currentQuizId ? "DAILY CHALLENGE" : "DEMO SESSION"}
                </div>
                <div className="text-sm font-black text-[#1a2340] dark:text-slate-100 flex items-center gap-2 truncate">
                  {username || "Candidate"} <span className="w-1 h-1 rounded-full bg-[#64748b]/20 shrink-0" /> <span className="text-[#7c3aed] font-mono shrink-0">{streak}d</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {total > 0 && !quizEnded && timerActive && (
                <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl font-mono text-base sm:text-lg font-black transition-all ${secondsLeft <= 5 ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20" : "bg-[#f8fafc] text-[#1a2340] border border-[#e8eaf0] dark:bg-slate-800 dark:text-slate-100 dark:border-white/10"}`}>
                  <TimerIcon size={18} />
                  <span>{String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</span>
                </div>
              )}
              {quizStarted && timerActive && !finished && !blocked && (
                <>
                  <Link
                    href="/user?tab=ContactUs"
                    prefetch={false}
                    className="inline-flex items-center justify-center px-2 py-2 sm:px-2.5 rounded-xl border border-[#e8eaf0] bg-[#f8fafc] text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-[#1a2340] hover:bg-[#f1f5f9] transition-all dark:bg-slate-800 dark:border-white/10 dark:text-slate-100 whitespace-nowrap"
                  >
                    Help
                  </Link>
                  <button
                    type="button"
                    onClick={() => openReport()}
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-red-200 bg-red-500/90 text-white flex items-center justify-center text-sm shadow-md hover:bg-red-500 transition-all active:scale-95"
                    aria-label="Report an issue"
                    title="Report an issue"
                  >
                    🚩
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] overflow-hidden px-1 flex items-center relative group">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-1.5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#60a5fa] shadow-[0_0_15px_rgba(124,58,237,0.4)] relative overflow-hidden"
                transition={{ duration: 0.8, ease: "circOut" }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              </motion.div>
              {/* Tooltip on hover */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#1a2340] text-white text-[8px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                PROGRESS: {Math.round(progress)}%
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a2340]" />
              </div>
            </div>
            <div className="text-[10px] font-black text-[#64748b]/60 tracking-widest whitespace-nowrap">
              {inReview ? "REVIEW" : `${Math.min(index + 1, total)} / ${total}`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto w-full scrollbar-hidden overscroll-contain pt-6 pb-[max(10rem,calc(6.25rem+env(safe-area-inset-bottom,0px)))]">
        <div className="max-w-2xl mx-auto px-6 space-y-8">
          {/* Question Segment */}
          {!current ? (
            <div className="py-12"><NoQuizPlaceholder /></div>
          ) : quizEnded ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#f8fafc] flex items-center justify-center mx-auto border border-[#e8eaf0]">
                <TimerIcon size={32} className="#64748b/20" />
              </div>
              <p className="text-[#64748b] font-black max-w-xs mx-auto">The quiz window has closed. Your results are being processed.</p>
            </div>
          ) : (
            <div className="animate-slide-up">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">{current.category}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-blue-50 text-[#7c3aed] border border-blue-100 shadow-sm">{current.difficulty}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!inReview && markedForReview.size < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = index
                        setMarkedForReview((s) => {
                          if (s.size >= 3) return s
                          const next = new Set(s)
                          next.add(idx)
                          return next
                        })
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${markedForReview.has(index) ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-white border border-[#e8eaf0] text-[#64748b]/40 hover:text-[#1a2340]"}`}
                      title="Mark for later"
                    >
                      <FileTextIcon size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-2xl sm:text-4xl font-black text-[#1a2340] leading-tight mb-8">
                {current.question}
              </h2>

              {hintRevealed && current.hint && (
                <div className="mb-8 p-5 rounded-2xl bg-blue-50 border border-blue-100 text-[#1a2340] text-sm leading-relaxed flex items-start gap-4 animate-pop">
                  <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                    <LightbulbIcon size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-[#7c3aed] mb-1 tracking-widest">Helpful Hint</div>
                    <div className="font-black">{current.hint}</div>
                  </div>
                </div>
              )}

              {answered && (
                <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3 animate-pop">
                  <CheckIcon size={20} className="text-emerald-600" />
                  <span className="text-emerald-700 font-black text-sm tracking-tight">Choice Lock: Your selection is final</span>
                </div>
              )}

              {/* Options Grid */}
              <div className="space-y-4">
                {current.options.map((opt, i) => {
                  const isSelected = i === selected
                  return (
                    <motion.button
                      key={i}
                      ref={i === 0 ? firstOptionRef : undefined}
                      whileHover={{ x: 5, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full group rounded-3xl p-5 text-left transition-all duration-300 border-2 flex items-center justify-between gap-4 outline-none ${isSelected ? "bg-[#1a2340] text-white border-[#1a2340] shadow-2xl" : "bg-white border-[#e8eaf0] hover:border-[#7c3aed]/30 hover:shadow-lg active:scale-[0.98]"}`}
                      onClick={() => {
                        if (quizEnded || anotherTabOpen || answered) return
                        setSelected(i)
                        try {
                          void triggerHapticImpact("light")
                          const ping = new Audio("https://assets.mixkit.co/active_storage/sfx/221/221-preview.mp3")
                          ping.volume = 0.2
                          ping.play().catch(() => {})
                        } catch { }
                      }}
                      disabled={quizEnded || anotherTabOpen || answered}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border transition-all ${isSelected ? "bg-white text-[#1a2340] border-white" : "bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0] group-hover:bg-[#e2e8f0]"}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className={`font-black text-base sm:text-xl leading-tight transition-colors ${isSelected ? "text-white" : "text-[#1a2340]"}`}>
                          {opt}
                        </span>
                      </div>
                      <div className={`shrink-0 w-6 h-6 rounded-full border-2 transition-all ${isSelected ? "border-white bg-white" : "border-[#e8eaf0] group-hover:border-[#7c3aed]/30 group-hover:scale-110"}`}>
                        {isSelected && <CheckIcon size={16} className="text-[#1a2340]" />}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Hint Trigger */}
              {current.hint && !hintRevealed && !answered && hintsUsed < 3 && (
                <button
                  type="button"
                  onClick={() => { setHintRevealed(true); setHintsUsed(h => h + 1) }}
                  className="mt-8 mx-auto flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                >
                  <LightbulbIcon size={14} /> Reveal Hint ({3 - hintsUsed} Left)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Section - Light */}
      <div className="shrink-0 z-[101] bg-white border-t border-[#e8eaf0] p-4 sm:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom,0px)+1rem)] sm:pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-white/10">
        <div className="max-w-2xl mx-auto flex gap-4 sm:gap-6">
          {canGoPrevious && (
            <button
              type="button"
              onClick={goToPrevious}
              disabled={quizEnded || anotherTabOpen}
              className="h-16 w-16 sm:w-auto sm:px-8 rounded-3xl bg-[#f8fafc] border border-[#e8eaf0] text-[#1a2340] flex items-center justify-center hover:bg-[#f1f5f9] transition-all active:scale-90 disabled:opacity-30"
            >
              <RefreshIcon size={24} className="-scale-x-100" />
              <span className="hidden sm:inline-block ml-3 font-black text-lg uppercase">Back</span>
            </button>
          )}

          <div className="flex-1 flex gap-3">
            {!(inReview ? reviewIndex >= questionsToReview.length - 1 : index >= total - 1) && (
              <button
                type="button"
                onClick={() => {
                  const timeTaken = Date.now() - questionStartRef.current
                  if (inReview) advanceReviewQuestion(timeTaken, false, -1)
                  else advanceQuestion(timeTaken, false, -1)
                }}
                className="flex-1 h-16 rounded-3xl bg-[#f8fafc] border border-[#e8eaf0] text-[#64748b] font-black text-lg hover:bg-[#f1f5f9] hover:text-[#1a2340] transition-all active:scale-95 uppercase"
                disabled={quizEnded || anotherTabOpen}
              >
                Skip
              </button>
            )}

            <button
              ref={nextButtonRef}
              onClick={() => {
                const timeTaken = Date.now() - questionStartRef.current
                const correct = current ? selected === current.correct : false
                if (inReview) advanceReviewQuestion(timeTaken, correct, selected ?? -1)
                else advanceQuestion(timeTaken, correct, selected ?? -1)
              }}
              className={`flex-[2] h-16 rounded-3xl font-black text-lg transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 uppercase tracking-wide disabled:opacity-30 ${answered || inReview ? "bg-emerald-500 text-black shadow-emerald-500/20" : "bg-primary text-black shadow-primary/20"}`}
              disabled={quizEnded || anotherTabOpen || (selected === null && !answered)}
            >
              <span>
                {inReview
                  ? (reviewIndex >= questionsToReview.length - 1 ? "Complete" : "Continue")
                  : (index >= total - 1 ? (markedForReview.size > 0 ? "Review Marked" : "Finalize") : "Next →")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showZoomWarning && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/95 backdrop-blur-xl p-6 animate-fade">
          <div className="card max-w-sm w-full p-8 text-center border border-[#e8eaf0] shadow-2xl bg-white">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6 transform -rotate-6">
              <span className="text-5xl">🔎</span>
            </div>
            <h3 className="text-2xl font-black text-[#1a2340] mb-3">Zoom Violation</h3>
            <p className="text-[#64748b] font-bold mb-8 leading-relaxed">
              Browser zoom is set to {Math.round((lastScale || 1) * 100)}%. Please reset to 100% (Ctrl+0) to continue. Zooming during competitive exams is prohibited.
            </p>
            <button
              onClick={() => setShowZoomWarning(false)}
              className="w-full h-14 rounded-2xl bg-primary text-black font-black text-lg hover:bg-amber-400 transition-all active:scale-95 uppercase"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
