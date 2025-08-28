"use client";

import { BackspaceIcon } from '@heroicons/react/24/outline';

type NumberPadProps = {
  onDigitClick: (digit: string) => void;
  onDeleteClick: () => void;
};

const padLayout = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'], // Using 'del' for the delete button
];

export default function NumberPad({ onDigitClick, onDeleteClick }: NumberPadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto">
      {padLayout.flat().map((key, index) => {
        if (key === '') {
          // Render an empty div to create the space in the grid
          return <div key={index} />;
        }

        if (key === 'del') {
          return (
            <button
              key={index}
              type="button"
              onClick={onDeleteClick}
              className="flex items-center justify-center h-20 bg-gray-200 text-gray-800 rounded-lg text-2xl font-semibold active:bg-gray-300 transition-colors duration-150"
              aria-label="delete last digit"
            >
              <BackspaceIcon className="h-8 w-8" />
            </button>
          );
        }

        return (
          <button
            key={index}
            type="button"
            onClick={() => onDigitClick(key)}
            className="h-20 bg-white text-gray-800 rounded-lg text-4xl font-light active:bg-gray-100 shadow-sm border border-gray-200 transition-colors duration-150"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
