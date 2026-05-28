# User Guide — AI Bookkeeping for Google Sheets

## Getting Started

1. **Make a copy** of the template to your Google Drive
2. **Authorize the script** when prompted (Extensions → Apps Script → Run onOpen)
3. **Open the sidebar**: AI Bookkeeping → Quick Entry
4. **Start typing** your expenses

## Quick Entry (Recommended)

The sidebar is the fastest way to log expenses:

1. Open **AI Bookkeeping → Quick Entry**
2. Type what you spent: `"coffee 4.50"`, `"lunch 32.50"`, `"uber to airport 35"`
3. Press Enter — the AI fills in date, amount, and category
4. The entry appears in the Journal sheet instantly

## Smart Entry

Alternatively, type descriptions directly in the Journal sheet's Description column:

1. Type a description in column B
2. Select the row
3. Click **AI Bookkeeping → Smart Entry**

## Dashboard

The Dashboard sheet automatically updates:

- **Total Spent** — sum of all entries
- **Total Entries** — count of entries
- **Avg per Entry** — average transaction amount
- **Category Breakdown** — spending by category

## Monthly Summary

Click **AI Bookkeeping → Monthly Summary** for a text overview of your spending.

## Categories

The Categories sheet shows all recognized categories and their keyword patterns. You can:

- Add new categories
- Remove categories you don't use
- The AI adapts to your custom categories automatically

## Free vs Pro

| Feature | Free | Pro |
|---------|------|-----|
| AI categorization | 50 entries | Unlimited |
| Languages | English | 7 languages |
| CSV import | — | ✅ |
| AI reports | Basic | AI-powered |
| Multi-currency | — | ✅ |
| Auto-learning | — | ✅ |

Upgrade at [tallyai.etsy.com](https://tallyai.etsy.com)

## Troubleshooting

**"Sheet not found" error**: Make sure you've run the initialization. Click AI Bookkeeping → Quick Entry once to trigger setup.

**Sidebar not showing**: Check that you've authorized the script. Go to Extensions → Apps Script and run `onOpen` from the editor.

**AI not categorizing**: The local pattern matcher works offline. For better accuracy, ensure you have internet access for the cloud AI enhancement.
