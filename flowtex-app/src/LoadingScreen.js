import React from 'react';

const LoadingScreen = ({ message = 'Preparing your editor…' }) => {
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#f0f2f5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      fontFamily: 'system-ui, sans-serif',
      transition: 'opacity 0.3s ease',
      opacity: 1,
    }}>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 600,
        color: '#333',
        marginBottom: '16px',
        letterSpacing: '-0.5px',
      }}>
        FlumenWrite
      </h1>
      <div style={{
        width: '120px',
        height: '4px',
        background: '#e0e0e0',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '60px',
          height: '100%',
          background: '#1a73e8',
          borderRadius: '2px',
          animation: 'loadingSlide 1.2s ease-in-out infinite',
        }} />
      </div>
      <p style={{
        marginTop: '12px',
        fontSize: '14px',
        color: '#666',
      }}>
        {message}
      </p>

      {/* Inject the keyframe animation */}
      <style>{`
        @keyframes loadingSlide {
          0% { transform: translateX(-60px); }
          50% { transform: translateX(60px); }
          100% { transform: translateX(-60px); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
