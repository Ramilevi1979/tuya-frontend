# הבית שלי – ממשק (Frontend)

React + Vite. עיצוב RTL בעברית, מצב בהיר/כהה אוטומטי.

## הרצה מקומית
```bash
cp .env.example .env   # ולערוך אם צריך
npm install
npm run dev
```

## משתני סביבה (Vercel: Settings → Environment Variables)
| משתנה | תיאור |
|---|---|
| `VITE_API_BASE_URL` | כתובת השרת כולל `/api` |
| `VITE_GOOGLE_CLIENT_ID` | מזהה הלקוח של Google (ציבורי) |

אימות המשתמש נעשה בשרת. הממשק רק שולח את אישור Google ומקבל חזרה טוקן שנשמר בדפדפן ל-30 יום.
