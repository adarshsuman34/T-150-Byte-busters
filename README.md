# AlumniHub

AlumniHub is a modern, client-side alumni management experience that stores data locally with the browser-native IndexedDB API. It offers a rich dashboard, a searchable alumni directory, an active mentor network view, and a visual analytics page—no server required.

## Features
- **Dashboard Overview** Main landing page with live stats, quick actions, and a responsive alumni table backed by IndexedDB.
- **Alumni Directory** Dedicated `alumni.html` page featuring search, mentor/year filters, and profile cards.
- **Mentor Network** `mentors.html` lists active mentors with discipline and graduation filters plus engagement metrics.
- **Analytics** `analytics.html` aggregates totals, mentor coverage by year, top disciplines, and recent updates.
- **IndexedDB Storage** Lightweight CRUD wrapper in `app.js`, `alumni.js`, `mentors.js`, and `analytics.js` to persist data locally.
- **Responsive UI** TailwindCSS-driven layout, animated modals, and polished hover effects.

## Project Structure
```
DRAFT/
├─ index.html          # Dashboard entry point
├─ alumni.html         # Full alumni directory
├─ mentors.html        # Mentor network overview
├─ analytics.html      # Analytics and insights dashboard
├─ app.js              # Dashboard logic + IndexedDB setup
├─ alumni.js           # Directory data loading and filters
├─ mentors.js          # Mentor filters, metrics, modal handling
├─ analytics.js        # Aggregated metrics and visualizations
├─ styles.css          # Custom styling (optional if present)
└─ .vscode/launch.json # Local dev convenience config
```

## Getting Started
1. **Clone or download** this repository.
2. **Open** the `index.html` file in your preferred browser (Chrome recommended for full IndexedDB tooling).
3. **Navigate** using the sidebar buttons to explore Alumni, Mentors, and Analytics pages.
4. **Add records** via any “Add Alumni”/“Add Mentor” button; data persists in the browser thanks to IndexedDB.

> Tip: Use Chrome DevTools → Application → IndexedDB to inspect stored records while developing.

## Development Notes
- The project uses **vanilla JavaScript** modules—no build tooling required.
- TailwindCSS is loaded via CDN; ensure internet access for styling.
- Each page re-initializes the IndexedDB connection, so changes made on one page appear on others after refresh or scheduled polling.

## Contributing
1. Fork the repository.
2. Create a feature branch.
3. Commit changes with clear messages.
4. Submit a pull request describing the update.

## License
This project is provided as-is. Add licensing details here if you intend to distribute it publicly.
