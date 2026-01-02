# Metro Aegis

A vertical arcade shoot 'em up inspired by classic 90s bullet-hell games.

## Features

- **3 Unique Ships**: Striker (focused power), Ranger (wide coverage), Phantom (homing missiles)
- **Dynamic Difficulty**: Rank system that adjusts based on your performance
- **Medal Chaining**: Collect medals without dropping them to build massive score multipliers
- **Boss Battles**: Multi-phase bosses with evolving attack patterns
- **Mobile-Optimized**: Runs at 60fps on modern iPhones with touch controls
- **Offline Play**: Full PWA support with service worker caching

## How to Run Locally

### Simple Method
Just open `index.html` in your web browser. The game will run immediately.

### With Local Server (Recommended for Service Worker)
For full PWA features including offline support:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000