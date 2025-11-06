/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg, type LogEvent } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// --- Icon Components (previously in components/icons.tsx) ---

interface IconProps {
  className?: string;
}

const FileUploadIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CheckCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DownloadIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const AlertTriangleIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const AudioWaveformIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h1.5v4.5h-1.5v-4.5Zm4.5 0h1.5v4.5h-1.5v-4.5Zm4.5 0h1.5v4.5h-1.5v-4.5Zm4.5 0h1.5v4.5h-1.5v-4.5Zm-13.5-3h1.5v10.5h-1.5v-10.5Zm4.5 0h1.5v10.5h-1.5v-10.5Zm4.5 0h1.5v10.5h-1.5v-10.5Zm4.5 0h1.5v10.5h-1.5v-10.5Z" />
    </svg>
);

// Define available states for the converter
enum ConversionState {
  LOADING_FFMPEG,
  IDLE,
  FILE_LOADED,
  CONVERTING,
  DONE,
  ERROR,
}

// --- Helper Components ---

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files[0].type.startsWith('audio/')) {
        onFileSelect(files[0]);
      } else {
        alert('Please drop an audio file.');
      }
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const dropzoneClasses = `flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${
    disabled
      ? 'bg-gray-800 border-gray-700 cursor-not-allowed'
      : isDragging
      ? 'border-indigo-400 bg-gray-700'
      : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
  }`;

  return (
    <div
      className={dropzoneClasses}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
        <FileUploadIcon className="w-10 h-10 mb-4" />
        <p className="mb-2 text-sm">
          <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs">Any audio format (MP3, WAV, M4A, etc.)</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
};

interface QualitySliderProps {
    quality: number;
    setQuality: (quality: number) => void;
    disabled: boolean;
}

const QualitySlider: React.FC<QualitySliderProps> = ({ quality, setQuality, disabled }) => {
    return (
        <div className="w-full space-y-2">
            <label htmlFor="quality" className="block text-sm font-medium text-gray-300">
                Compression Quality
            </label>
            <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-400">High Comp.</span>
                <input
                    id="quality"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={quality}
                    onChange={(e) => setQuality(parseInt((e.target as HTMLInputElement).value, 10))}
                    disabled={disabled}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-xs text-gray-400">High Qual.</span>
            </div>
             <p className="text-xs text-gray-500 text-center">Lower values result in smaller file sizes and lower audio quality.</p>
        </div>
    );
};


// --- Main App Component ---

export default function App() {
  const [appState, setAppState] = useState<ConversionState>(ConversionState.LOADING_FFMPEG);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState(4); // OGG Vorbis quality -1 to 10. 4 is a good balance.
  const [errorMessage, setErrorMessage] = useState('');
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      if (ffmpegRef.current) return;

      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }: LogEvent) => {
        // console.log(message);
      });
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });
      
      try {
        // Fetch from the same CDN as the rest of the app to avoid CORS issues
        const baseURL = "https://aistudiocdn.com/@ffmpeg/ffmpeg@0.12.15/dist/esm";
        
        const coreURL = `${baseURL}/ffmpeg-core.js`;
        const wasmURL = `${baseURL}/ffmpeg-core.wasm`;
        const workerURL = `${baseURL}/ffmpeg-core.worker.js`;

        // Fetch all assets and create Blob URLs to bypass CORS issues.
        const [coreResponse, wasmResponse, workerResponse] = await Promise.all([
          fetch(coreURL),
          fetch(wasmURL),
          fetch(workerURL)
        ]);

        if (!coreResponse.ok) throw new Error(`Failed to fetch core script: ${coreResponse.statusText}`);
        if (!wasmResponse.ok) throw new Error(`Failed to fetch wasm module: ${wasmResponse.statusText}`);
        if (!workerResponse.ok) throw new Error(`Failed to fetch worker script: ${workerResponse.statusText}`);

        const coreBlob = new Blob([await coreResponse.text()], { type: 'text/javascript' });
        const wasmBlob = await wasmResponse.blob();
        const workerBlob = new Blob([await workerResponse.text()], { type: 'text/javascript' });

        const coreObjectURL = URL.createObjectURL(coreBlob);
        const wasmObjectURL = URL.createObjectURL(wasmBlob);
        const workerObjectURL = URL.createObjectURL(workerBlob);

        await ffmpeg.load({
            coreURL: coreObjectURL,
            wasmURL: wasmObjectURL,
            workerURL: workerObjectURL,
        });

        ffmpegRef.current = ffmpeg;
        setAppState(ConversionState.IDLE);
      } catch (error) {
        console.error("Failed to load ffmpeg components", error);
        setErrorMessage('Failed to initialize the converter. Please refresh the page.');
        setAppState(ConversionState.ERROR);
      }
    };
    loadFFmpeg();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (file: File) => {
    setInputFile(file);
    setAppState(ConversionState.FILE_LOADED);
    setOutputUrl(null);
    setOutputSize(null);
    setErrorMessage('');
  };

  const handleConvert = async () => {
    if (!inputFile || !ffmpegRef.current) return;

    setAppState(ConversionState.CONVERTING);
    setProgress(0);
    
    const ffmpeg = ffmpegRef.current;
    const inputFileName = 'input_audio';
    const outputFileName = 'output.ogg';

    try {
      await ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));
      
      // FFmpeg command: -i [input] -c:a [codec] -q:a [quality] [output]
      await ffmpeg.exec(['-i', inputFileName, '-c:a', 'libvorbis', '-q:a', String(quality), outputFileName]);
      
      const data = await ffmpeg.readFile(outputFileName) as Uint8Array;
      
      const blob = new Blob([data.buffer], { type: 'audio/ogg' });
      setOutputUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      setAppState(ConversionState.DONE);
      
    } catch (error) {
      console.error('Conversion failed:', error);
      setErrorMessage('An error occurred during conversion. Please try again.');
      setAppState(ConversionState.ERROR);
    } finally {
        // Cleanup files in wasm memory
        try {
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);
        } catch(e) {
            console.warn("Could not cleanup files from wasm memory.", e)
        }
    }
  };

  const reset = () => {
    setInputFile(null);
    setOutputUrl(null);
    setOutputSize(null);
    setProgress(0);
    setErrorMessage('');
    setAppState(ConversionState.IDLE);
  };

  const renderContent = () => {
    switch (appState) {
      case ConversionState.LOADING_FFMPEG:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
             <AudioWaveformIcon className="w-12 h-12 mb-4 animate-pulse text-indigo-400" />
            <h3 className="text-lg font-medium">Initializing Converter</h3>
            <p className="text-sm text-gray-400">This may take a few seconds...</p>
          </div>
        );

      case ConversionState.IDLE:
      case ConversionState.FILE_LOADED:
        return (
          <div className="space-y-6">
            <FileUpload onFileSelect={handleFileSelect} disabled={appState !== ConversionState.IDLE} />
            {inputFile && (
              <div className="p-4 bg-gray-700/50 rounded-lg text-sm">
                <p className="font-medium truncate text-gray-200">{inputFile.name}</p>
                <p className="text-gray-400">{(inputFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
            <QualitySlider quality={quality} setQuality={setQuality} disabled={appState === ConversionState.IDLE} />
            <button
              onClick={handleConvert}
              disabled={appState !== ConversionState.FILE_LOADED}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
            >
              Convert to OGG
            </button>
          </div>
        );

      case ConversionState.CONVERTING:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="text-lg font-medium mb-4">Converting...</h3>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-2xl font-semibold mt-4">{progress}%</p>
            <p className="text-sm text-gray-400 mt-1">Please wait, this can take a moment for large files.</p>
          </div>
        );

      case ConversionState.DONE:
        return (
          <div className="space-y-4 text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto" />
            <h3 className="text-2xl font-bold">Conversion Complete!</h3>
             {inputFile && outputSize && (
                <p className="text-gray-400">
                    Original: {(inputFile.size / 1024 / 1024).toFixed(2)} MB &rarr; Compressed: {(outputSize / 1024 / 1024).toFixed(2)} MB
                </p>
            )}
            {outputUrl && (
                <div className='py-4'>
                    <audio controls src={outputUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
            <a
              href={outputUrl!}
              download={`${inputFile?.name.split('.')[0] || 'audio'}.ogg`}
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-5 h-5"/>
              Download OGG
            </a>
            <button
              onClick={reset}
              className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Convert Another File
            </button>
          </div>
        );
        
      case ConversionState.ERROR:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <AlertTriangleIcon className="w-16 h-16 text-red-400 mx-auto" />
            <h3 className="text-2xl font-bold">An Error Occurred</h3>
            <p className="text-gray-400">{errorMessage}</p>
            <button
              onClick={reset}
              className="bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4 font-sans">
        <header className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                Audio to OGG Converter
            </h1>
            <p className="mt-2 text-lg text-gray-400">
                Fast, secure, and client-side audio compression.
            </p>
        </header>
      <main className="w-full max-w-lg">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8 min-h-[420px] flex flex-col justify-center transition-all duration-300">
          {renderContent()}
        </div>
      </main>
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Powered by FFmpeg.wasm. All processing is done in your browser.</p>
        <p>Your files are never uploaded to a server.</p>
      </footer>
    </div>
  );
}