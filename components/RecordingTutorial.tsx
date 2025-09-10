import React from 'react';

interface RecordingTutorialProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const RecordingTutorial: React.FC<RecordingTutorialProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-gray-700 animate-fade-in">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">How to Record Your Video</h2>
        <p className="text-gray-300 mb-6">
          This method ensures a high-quality video without any browser UI. Please follow these steps:
        </p>
        <ol className="list-decimal list-inside space-y-4 text-gray-200">
          <li>
            <span className="font-semibold">A new, small preview window will open.</span>
            <p className="text-sm text-gray-400 pl-6">This window shows exactly what will be recorded.</p>
          </li>
          <li>
            <span className="font-semibold">Your browser will ask you to share your screen.</span>
            <p className="text-sm text-gray-400 pl-6">This is necessary to capture the animation.</p>
          </li>
          <li>
            <span className="font-semibold">In the prompt, select the <span className="text-cyan-300 bg-gray-700 px-1 rounded">'Tab'</span> option.</span>
            <p className="text-sm text-gray-400 pl-6">Then, choose the window titled <span className="italic">"Recording Preview"</span>.</p>
          </li>
          <li>
            <span className="font-semibold">Click 'Share' to begin recording.</span>
            <p className="text-sm text-gray-400 pl-6">Recording will stop automatically after one loop, and the video will download.</p>
          </li>
        </ol>
        <div className="mt-8 flex justify-end space-x-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md text-white font-bold transition-colors">
            Got it, Start Recording!
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default RecordingTutorial;