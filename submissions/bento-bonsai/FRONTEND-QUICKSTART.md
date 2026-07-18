# Bento Bonsai Frontend - Quick Setup

## 🚀 The frontend is installing in the background!

While `create-next-app` completes, here's what will be built:

---

## 📁 Structure

```
frontend/
├── app/
│   ├── page.tsx              # Welcome screen
│   ├── forest/page.tsx       # Home (Bonsai growth)
│   ├── play/page.tsx         # Quiz interface
│   ├── clubs/page.tsx        # Groves
│   ├── profile/page.tsx      # User profile
│   └── layout.tsx            # Root with WalletConnect
├── components/
│   ├── Bonsai.tsx            # Animated tree
│   ├── QuizCard.tsx          # Question card
│   ├── GrowthAnimation.tsx   # Reward animation
│   ├── BottomNav.tsx         # Navigation
│   └── WalletButton.tsx      # Connect wallet
├── lib/
│   ├── wagmi.ts              # Wallet config
│   └── api.ts                # Backend API calls
└── public/
    └── bonsai/               # Tree SVGs
```

---

## 🎨 Design System (Tailwind Config)

```typescript
// tailwind.config.ts
colors: {
  forest: {
    50: '#f0fdf4',    // Light mint
    100: '#dcfce7',
    500: '#22c55e',   // Forest green
    700: '#15803d',
    900: '#14532d',
  },
  cream: '#fef3c7',
  beige: '#fef9e7',
  sky: '#bae6fd',
}

fontFamily: {
  sans: ['Inter', 'SF Pro Display', 'system-ui'],
}
```

---

## 🔗 WalletConnect Setup

```bash
# Once create-next-app finishes
cd frontend
npm install wagmi viem @rainbow-me/rainbowkit
npm install framer-motion lucide-react
npm install swr axios
```

---

## 📡 Backend Integration

```typescript
// lib/api.ts
const API_URL = "http://localhost:3001";

export async function loginWallet(address: string, signature: string, timestamp: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, timestamp }),
  });
  return res.json();
}

export async function getMarkets(address?: string) {
  const url = address 
    ? `${API_URL}/api/markets?address=${address}`
    : `${API_URL}/api/markets`;
  const res = await fetch(url);
  return res.json();
}
```

---

## 🌱 Core Components

### 1. Welcome Screen
```tsx
// app/page.tsx
export default function Welcome() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center space-y-8">
        <div className="text-6xl">🌸</div>
        <h1 className="text-5xl font-bold text-forest-900">
          Bento Bonsai
        </h1>
        <p className="text-xl text-forest-700">
          Grow your Bonsai by beating history.
        </p>
        <button className="bg-forest-500 text-white px-12 py-4 rounded-full text-lg hover:bg-forest-600 transition">
          Start Growing
        </button>
      </div>
    </div>
  );
}
```

### 2. Bonsai Component
```tsx
// components/Bonsai.tsx
'use client';
import { motion } from 'framer-motion';

export default function Bonsai({ level = 1 }) {
  return (
    <motion.div
      className="relative w-64 h-64"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, type: "spring" }}
    >
      {/* SVG Bonsai tree - grows based on level */}
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Pot */}
        <rect x="70" y="160" width="60" height="40" rx="4" fill="#8B4513" />
        
        {/* Trunk */}
        <motion.path
          d="M 100 160 Q 95 140, 100 120"
          stroke="#654321"
          strokeWidth="8"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
        />
        
        {/* Branches - show more as level increases */}
        {level >= 2 && (
          <motion.circle
            cx="100"
            cy="110"
            r="20"
            fill="#22c55e"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          />
        )}
        
        {/* Flowers - appear at higher levels */}
        {level >= 5 && (
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }}>
            <circle cx="95" cy="105" r="3" fill="#ffc0cb" />
            <circle cx="105" cy="105" r="3" fill="#ffc0cb" />
          </motion.g>
        )}
      </svg>
      
      <p className="text-center text-forest-700 font-medium mt-4">
        Level {level}
      </p>
    </motion.div>
  );
}
```

### 3. Quiz Card
```tsx
// components/QuizCard.tsx
'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function QuizCard({ question, onAnswer }) {
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null);

  return (
    <motion.div
      className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-12"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <h2 className="text-3xl font-bold text-center text-forest-900 mb-8">
        Can you beat history?
      </h2>
      
      <div className="mb-12">
        <p className="text-sm text-forest-600 mb-2">March 2025</p>
        <p className="text-2xl text-forest-900">
          {question || "Will Bitcoin reach $100,000 before April?"}
        </p>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={() => setSelected('yes')}
          className={`w-full py-6 rounded-2xl text-xl font-medium transition ${
            selected === 'yes'
              ? 'bg-forest-500 text-white'
              : 'bg-forest-50 text-forest-900 hover:bg-forest-100'
          }`}
        >
          ○ YES
        </button>
        
        <button
          onClick={() => setSelected('no')}
          className={`w-full py-6 rounded-2xl text-xl font-medium transition ${
            selected === 'no'
              ? 'bg-forest-500 text-white'
              : 'bg-forest-50 text-forest-900 hover:bg-forest-100'
          }`}
        >
          ○ NO
        </button>
      </div>
      
      {selected && (
        <motion.button
          onClick={() => onAnswer(selected)}
          className="w-full mt-8 bg-forest-500 text-white py-4 rounded-full text-lg font-medium hover:bg-forest-600"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Confirm
        </motion.button>
      )}
    </motion.div>
  );
}
```

### 4. Bottom Navigation
```tsx
// components/BottomNav.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TreePine, Gamepad2, Users, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  
  const tabs = [
    { href: '/forest', icon: TreePine, label: 'Forest' },
    { href: '/play', icon: Gamepad2, label: 'Play' },
    { href: '/clubs', icon: Users, label: 'Clubs' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-forest-100">
      <div className="max-w-7xl mx-auto flex justify-around py-3">
        {tabs.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition ${
                isActive
                  ? 'text-forest-600'
                  : 'text-forest-400 hover:text-forest-500'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 5. Wallet Button
```tsx
// components/WalletButton.tsx
'use client';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useState } from 'react';
import { loginWallet } from '@/lib/api';

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleConnect() {
    try {
      // Connect wallet
      await connect({ connector: connectors[0] });
      
      // Sign message for Bento auth
      setIsLoggingIn(true);
      const timestamp = Date.now().toString();
      const message = `Bento.fun Login\nTimestamp: ${timestamp}\nWallet: ${address}`;
      const signature = await signMessageAsync({ message });
      
      // Login to backend
      const { token } = await loginWallet(address!, signature, timestamp);
      localStorage.setItem('bentoToken', token);
      localStorage.setItem('walletAddress', address!);
      
      setIsLoggingIn(false);
    } catch (err) {
      console.error('Auth failed:', err);
      setIsLoggingIn(false);
    }
  }

  if (isLoggingIn) {
    return (
      <button className="bg-forest-500 text-white px-6 py-3 rounded-full" disabled>
        Connecting...
      </button>
    );
  }

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        className="bg-forest-100 text-forest-700 px-6 py-3 rounded-full hover:bg-forest-200"
      >
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="bg-forest-500 text-white px-6 py-3 rounded-full hover:bg-forest-600"
    >
      Connect Wallet
    </button>
  );
}
```

---

## 🏃 Running the App

```bash
# Once installation completes
cd frontend
npm run dev
```

Open `http://localhost:3000`

---

## 🎨 Key Design Principles Applied

✅ **Minimal** - One CTA per screen  
✅ **Spacious** - Generous padding everywhere  
✅ **Calm** - Soft colors, gentle animations  
✅ **Delightful** - Framer Motion for spring animations  
✅ **Clear** - Large typography, simple hierarchy  

---

## 🔄 Integration with Backend

The frontend will:
1. **Connect wallet** via RainbowKit
2. **Sign message** to authenticate
3. **Call backend** at `localhost:3001`
4. **Fetch real markets** from Bento + Polymarket
5. **Display as quiz questions** in game format

---

## 📝 Next Steps

1. Wait for `create-next-app` to finish
2. Copy components from this guide
3. Run `npm run dev`
4. Start backend: `npm run server` (in root)
5. Test wallet connection
6. Play first quiz!

---

**The frontend will hide ALL financial complexity behind a beautiful game.** 🌸
