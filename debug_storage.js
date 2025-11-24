// Quick debug script to check localStorage
// Run this in Android emulator console (via Chrome DevTools remote debugging)

console.log('=== SCHAPPIE DEBUG ===');
console.log('Session:', localStorage.getItem('sms_user_session_v2'));
console.log('Pro Welcome:', localStorage.getItem('sms_pro_welcome_shown'));
console.log('Favorites:', localStorage.getItem('sms_favorites'));
console.log('List:', localStorage.getItem('sms_list'));
console.log('History:', localStorage.getItem('sms_history'));

// To reset everything:
// localStorage.clear();
// location.reload();
