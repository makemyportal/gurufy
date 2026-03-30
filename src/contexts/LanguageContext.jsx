import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export function useLanguage() {
  return useContext(LanguageContext)
}

// ─── Translation Strings ───────────────────────────────────────────────────
const translations = {
  english: {
    // Nav
    feed: 'Feed', groups: 'Groups', careers: 'Careers', resources: 'Resources',
    aiMagic: 'AI Magic', messages: 'Messages', events: 'Events',
    leaderboard: 'Leaderboard', dashboard: 'Dashboard', myProfile: 'My Profile',
    schoolProfile: 'School Profile', findTalent: 'Find Talent',
    signIn: 'Sign In', signOut: 'Sign Out', settings: 'Settings',

    // Feed
    welcomeBack: 'Welcome back',
    welcomeTo: 'Welcome to',
    communityFeed: 'Live Community Feed',
    latestCommunity: 'Latest from the Community',
    insights: 'insights',
    sharePlaceholder: 'Share an insight, teaching tip, or question with the community...',
    attach: 'Attach',
    publish: 'Publish',
    publishing: 'Publishing...',
    like: 'Like', liked: 'Liked',
    discuss: 'Discuss', share: 'Share',
    addComment: 'Add a comment...',
    noPosts: 'No posts yet',
    beFirst: 'Be the first to share with the community!',
    joinNetwork: 'Join the Knowledge Network',
    joinDesc: "Share insights, discuss strategies, and connect with India's best educators.",
    signInContribute: 'Sign In to Contribute',
    posts: 'Posts', likes: 'Likes', contributors: 'Contributors',
    trendingTopics: 'Trending Topics',
    platformActivity: 'Platform Activity',
    knowledgePosts: 'Knowledge Posts',
    totalLikes: 'Total Likes',
    tryAiTools: 'Try AI Tools',
    superchargeTeaching: 'Supercharge your teaching',
    superchargeDesc: 'Use AI tools to generate lesson plans, worksheets & quizzes in seconds.',

    // Settings
    settingsTitle: 'Settings',
    settingsDesc: 'Manage your account, privacy, and preferences',
    account: 'Account', notifications: 'Notifications',
    privacy: 'Privacy & Security', appearance: 'Appearance',
    profilePhoto: 'Profile Photo',
    personalInfo: 'Personal Information',
    fullName: 'Full Name', email: 'Email', phone: 'Phone',
    location: 'Location', bio: 'Bio', subject: 'Subject',
    qualification: 'Qualification', experience: 'Experience',
    saveChanges: 'Save Changes', saving: 'Saving...',
    notifPrefs: 'Notification Preferences',
    notifDesc: 'Control how and when you receive notifications.',
    savePrefs: 'Save Preferences',
    profileVisibility: 'Profile Visibility',
    visibilityDesc: 'Choose what others can see about you.',
    publicProfile: 'Public Profile', publicProfileDesc: 'Anyone can view your profile',
    showEmail: 'Show Email', showEmailDesc: 'Display email on your public profile',
    showPhone: 'Show Phone', showPhoneDesc: 'Display phone number on your profile',
    savePrivacy: 'Save Privacy Settings',
    password: 'Password', passwordDesc: 'Send a password reset link to your email.',
    sendReset: 'Send Password Reset Email',
    dangerZone: 'Danger Zone',
    dangerDesc: 'Permanently delete your account and all associated data. This cannot be undone.',
    deleteAccount: 'Delete Account',
    themeTitle: 'Theme', themeDesc: 'Choose your preferred color scheme. Changes apply instantly.',
    light: 'Light', dark: 'Dark',
    lightDesc: 'Clean & bright', darkDesc: 'Easy on eyes',
    darkActive: 'Dark mode is active', lightActive: 'Light mode is active',
    themeSaved: 'Theme preference is saved automatically',
    languageTitle: 'Language', languageDesc: 'Select your preferred display language.',

    // Jobs
    jobs: 'Jobs', postJob: 'Post a Job', applyNow: 'Apply Now',
    applied: 'Applied ✓', viewDetails: 'View Details',

    // Common
    cancel: 'Cancel', delete: 'Delete', save: 'Save',
    loading: 'Loading...', error: 'Something went wrong.',
    download: 'Download', upload: 'Upload',
    teacher: 'Teacher', school: 'School',
  },

  hindi: {
    // Nav
    feed: 'फ़ीड', groups: 'समूह', careers: 'करियर', resources: 'संसाधन',
    aiMagic: 'AI जादू', messages: 'संदेश', events: 'कार्यक्रम',
    leaderboard: 'लीडरबोर्ड', dashboard: 'डैशबोर्ड', myProfile: 'मेरी प्रोफ़ाइल',
    schoolProfile: 'स्कूल प्रोफ़ाइल', findTalent: 'प्रतिभा खोजें',
    signIn: 'लॉग इन', signOut: 'लॉग आउट', settings: 'सेटिंग्स',

    // Feed
    welcomeBack: 'वापसी पर स्वागत है',
    welcomeTo: 'में आपका स्वागत है',
    communityFeed: 'लाइव कम्युनिटी फ़ीड',
    latestCommunity: 'कम्युनिटी से नवीनतम',
    insights: 'पोस्ट',
    sharePlaceholder: 'कम्युनिटी के साथ एक टिप, सुझाव या सवाल साझा करें...',
    attach: 'अटैच',
    publish: 'प्रकाशित करें',
    publishing: 'प्रकाशित हो रहा है...',
    like: 'पसंद', liked: 'पसंद किया',
    discuss: 'चर्चा', share: 'शेयर',
    addComment: 'टिप्पणी लिखें...',
    noPosts: 'अभी कोई पोस्ट नहीं',
    beFirst: 'कम्युनिटी के साथ पहला पोस्ट शेयर करें!',
    joinNetwork: 'नॉलेज नेटवर्क से जुड़ें',
    joinDesc: 'ज्ञान साझा करें, रणनीतियों पर चर्चा करें और भारत के सर्वश्रेष्ठ शिक्षकों से जुड़ें।',
    signInContribute: 'योगदान के लिए लॉग इन करें',
    posts: 'पोस्ट', likes: 'पसंद', contributors: 'योगदानकर्ता',
    trendingTopics: 'ट्रेंडिंग विषय',
    platformActivity: 'प्लेटफ़ॉर्म गतिविधि',
    knowledgePosts: 'ज्ञान पोस्ट',
    totalLikes: 'कुल पसंद',
    tryAiTools: 'AI टूल आज़माएं',
    superchargeTeaching: 'अपनी शिक्षा को बेहतर बनाएं',
    superchargeDesc: 'AI टूल से सेकंड में पाठ योजना, वर्कशीट और क्विज़ बनाएं।',

    // Settings
    settingsTitle: 'सेटिंग्स',
    settingsDesc: 'अपने खाते, गोपनीयता और प्राथमिकताएं प्रबंधित करें',
    account: 'खाता', notifications: 'सूचनाएं',
    privacy: 'गोपनीयता और सुरक्षा', appearance: 'दिखावट',
    profilePhoto: 'प्रोफ़ाइल फ़ोटो',
    personalInfo: 'व्यक्तिगत जानकारी',
    fullName: 'पूरा नाम', email: 'ईमेल', phone: 'फ़ोन',
    location: 'स्थान', bio: 'परिचय', subject: 'विषय',
    qualification: 'योग्यता', experience: 'अनुभव',
    saveChanges: 'परिवर्तन सहेजें', saving: 'सहेज रहे हैं...',
    notifPrefs: 'सूचना प्राथमिकताएं',
    notifDesc: 'नियंत्रण करें कि आपको सूचनाएं कब और कैसे मिलें।',
    savePrefs: 'प्राथमिकताएं सहेजें',
    profileVisibility: 'प्रोफ़ाइल दृश्यता',
    visibilityDesc: 'चुनें कि दूसरे आपके बारे में क्या देख सकते हैं।',
    publicProfile: 'सार्वजनिक प्रोफ़ाइल', publicProfileDesc: 'कोई भी आपकी प्रोफ़ाइल देख सकता है',
    showEmail: 'ईमेल दिखाएं', showEmailDesc: 'सार्वजनिक प्रोफ़ाइल पर ईमेल प्रदर्शित करें',
    showPhone: 'फ़ोन दिखाएं', showPhoneDesc: 'प्रोफ़ाइल पर फ़ोन नंबर प्रदर्शित करें',
    savePrivacy: 'गोपनीयता सेटिंग्स सहेजें',
    password: 'पासवर्ड', passwordDesc: 'अपने ईमेल पर पासवर्ड रीसेट लिंक भेजें।',
    sendReset: 'पासवर्ड रीसेट ईमेल भेजें',
    dangerZone: 'खतरनाक क्षेत्र',
    dangerDesc: 'आपका खाता और सभी डेटा स्थायी रूप से हटा दिया जाएगा। यह वापस नहीं किया जा सकता।',
    deleteAccount: 'खाता हटाएं',
    themeTitle: 'थीम', themeDesc: 'अपना पसंदीदा रंग चुनें। परिवर्तन तुरंत लागू होंगे।',
    light: 'लाइट', dark: 'डार्क',
    lightDesc: 'साफ़ और उज्ज्वल', darkDesc: 'आँखों के लिए आरामदायक',
    darkActive: 'डार्क मोड सक्रिय है', lightActive: 'लाइट मोड सक्रिय है',
    themeSaved: 'थीम प्राथमिकता स्वचालित रूप से सहेजी जाती है',
    languageTitle: 'भाषा', languageDesc: 'अपनी पसंदीदा भाषा चुनें।',

    // Jobs
    jobs: 'नौकरियां', postJob: 'नौकरी पोस्ट करें', applyNow: 'अभी आवेदन करें',
    applied: 'आवेदन किया ✓', viewDetails: 'विवरण देखें',

    // Common
    cancel: 'रद्द करें', delete: 'हटाएं', save: 'सहेजें',
    loading: 'लोड हो रहा है...', error: 'कुछ गलत हुआ।',
    download: 'डाउनलोड', upload: 'अपलोड',
    teacher: 'शिक्षक', school: 'विद्यालय',
  },
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('gurufy-language') || 'english'
  })

  useEffect(() => {
    localStorage.setItem('gurufy-language', language)
    // Set html lang attribute
    document.documentElement.lang = language === 'hindi' ? 'hi' : 'en'
  }, [language])

  const t = (key) => translations[language]?.[key] || translations.english[key] || key

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
