
import React from 'react';

interface FileUploadProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  return (
    <div className="mb-6">
      <label htmlFor="file-upload" className="block text-lg font-medium mb-2 text-cyan-400">
        Upload WebP File
      </label>
      <label htmlFor="file-upload" className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer hover:border-cyan-500 transition-colors">
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex text-sm text-gray-400">
            <span
              className="relative rounded-md font-medium text-cyan-400 hover:text-cyan-300"
            >
              <span>Click to upload</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/webp" onChange={onFileChange} />
            </span>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">Animated WEBP only</p>
        </div>
      </label>
    </div>
  );
};

export default FileUpload;
