
import React from 'react';

const Header: React.FC = () => {
  return (
    <>
      <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-8 py-4">
          <h1 className="glitch text-3xl sm:text-4xl font-extrabold text-center tracking-wider" data-text="WebP Glitcher">
            <span className="text-white">WebP</span>
            <span className="text-cyan-400"> Glitcher</span>
          </h1>
          <p className="text-center text-gray-400 mt-1">Apply real-time corrupting filters to your animated images</p>
        </div>
      </header>
      <style>{`
        .glitch {
          position: relative;
        }
        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          clip-path: inset(0 0 0 0);
        }
        .glitch::before {
          left: -2px;
          text-shadow: 1px 0 #ff00c1;
          animation: glitch-anim-1 2.5s infinite linear alternate-reverse;
        }
        .glitch::after {
          left: 2px;
          text-shadow: -1px 0 #00fff9;
          animation: glitch-anim-2 2s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim-1 {
          0% { clip-path: inset(45% 0 50% 0); }
          20% { clip-path: inset(10% 0 5% 0); }
          40% { clip-path: inset(70% 0 1% 0); }
          60% { clip-path: inset(90% 0 8% 0); }
          80% { clip-path: inset(40% 0 15% 0); }
          100% { clip-path: inset(60% 0 35% 0); }
        }
        @keyframes glitch-anim-2 {
          0% { clip-path: inset(2% 0 90% 0); }
          20% { clip-path: inset(80% 0 5% 0); }
          40% { clip-path: inset(40% 0 45% 0); }
          60% { clip-path: inset(20% 0 1% 0); }
          80% { clip-path: inset(95% 0 4% 0); }
          100% { clip-path: inset(55% 0 10% 0); }
        }
      `}</style>
    </>
  );
};

export default Header;
