"use client";

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Driver = {
  id: string;
  name: string;
};

type DriverSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectDriver: (driver: Driver) => void;
  selectedDriverId: string | null;
};

export default function DriverSidebar({ isOpen, onClose, onSelectDriver, selectedDriverId }: DriverSidebarProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch drivers only when the sidebar is opened to avoid unnecessary requests
    if (isOpen) {
      const fetchDrivers = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch('/api/drivers');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch drivers.');
          }
          const data = await response.json();
          setDrivers(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchDrivers();
    }
  }, [isOpen]);

  const handleSelect = (driver: Driver) => {
    onSelectDriver(driver);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 flex flex-col w-64 bg-gray-800 text-white z-40 transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} ease-in-out duration-300`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Select a Driver</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 lg:hidden">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-gray-400">Loading drivers...</p>
          ) : error ? (
            <p className="p-4 text-red-400">Error: {error}</p>
          ) : drivers.length === 0 ? (
            <p className="p-4 text-gray-400">No active drivers found.</p>
          ) : (
            <ul>
              {drivers.map((driver) => (
                <li key={driver.id}>
                  <button
                    onClick={() => handleSelect(driver)}
                    className={`w-full text-left p-4 text-lg transition-colors duration-150 ${selectedDriverId === driver.id ? 'bg-indigo-600 font-semibold' : 'hover:bg-gray-700'}`}
                  >
                    {driver.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
