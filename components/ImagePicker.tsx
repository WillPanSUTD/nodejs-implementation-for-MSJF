
import React, { useRef } from 'react';

interface ImagePickerProps {
  label: string;
  image: string | null;
  onImageChange: (data: string) => void;
  description: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ label, image, onImageChange, description }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-blue-500/50 transition-all group">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{label}</h3>
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-800 cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-700 group-hover:border-blue-500/30 transition-colors"
      >
        {image ? (
          <img src={image} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center p-4">
            <i className="fa-solid fa-cloud-arrow-up text-3xl mb-2 text-gray-600"></i>
            <p className="text-xs text-gray-500">Click to upload {label}</p>
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <p className="text-[10px] text-gray-600 italic">{description}</p>
    </div>
  );
};

export default ImagePicker;
