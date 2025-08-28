"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bars3Icon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import DriverSidebar from '../components/DriverSidebar';
import NumberPad from '../components/NumberPad';

type Driver = { id: string; name: string; };
type ManagerSession = { id: string; username: string; };
type BottleEntry = { id: number; bottle_count: number; };

export default function ManagerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<ManagerSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [bottleCount, setBottleCount] = useState('0');
  const [isNumberPadVisible, setIsNumberPadVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [lastEntry, setLastEntry] = useState<BottleEntry | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetch('/api/auth/manager/session').then(res => {
      if (!res.ok) router.push('/m/login');
      return res.json();
    }).then(setSession).catch(() => router.push('/m/login'));
  }, [router]);

  const fetchLastEntry = useCallback(async (driverId: string) => {
    try {
      const response = await fetch(`/api/entries?driver_id=${driverId}`);
      if (response.ok) {
        const data = await response.json();
        setLastEntry(data);
      } else {
        setLastEntry(null);
      }
    } catch (error) {
      console.error("Failed to fetch last entry", error);
      setLastEntry(null);
    }
  }, []);

  useEffect(() => {
    if (selectedDriver) {
      fetchLastEntry(selectedDriver.id);
    } else {
      setLastEntry(null);
    }
  }, [selectedDriver, fetchLastEntry]);

  const handleLogout = async () => {
    await fetch('/api/auth/manager/logout', { method: 'POST' });
    router.push('/m/login');
  };

  const handleDigitClick = (digit: string) => {
    if (bottleCount === '0') {
      setBottleCount(digit);
    } else if (bottleCount.length < 4) {
      setBottleCount(bottleCount + digit);
    }
  };

  const handleDeleteClick = () => {
    setBottleCount(bottleCount.length > 1 ? bottleCount.slice(0, -1) : '0');
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async () => {
    if (!selectedDriver || bottleCount === '0' || submitLoading) return;
    setSubmitLoading(true);

    const endpoint = '/api/entries';
    const method = isEditMode ? 'PUT' : 'POST';
    const body = isEditMode
      ? { entry_id: lastEntry?.id, bottle_count: bottleCount }
      : { driver_id: selectedDriver.id, bottle_count: bottleCount };

    try {
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'save'} entry.`);

      showNotification(`Entry ${isEditMode ? 'updated' : 'saved'} successfully!`, 'success');
      setBottleCount('0');
      setIsNumberPadVisible(false);
      setIsEditMode(false);
      fetchLastEntry(selectedDriver.id); // Refresh last entry data
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!lastEntry) return;
    setIsEditMode(true);
    setBottleCount(String(lastEntry.bottle_count));
    setIsNumberPadVisible(true);
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col font-sans">
        <DriverSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onSelectDriver={(driver) => { setSelectedDriver(driver); setBottleCount('0'); setIsNumberPadVisible(false); setIsEditMode(false); }} selectedDriverId={selectedDriver?.id || null} />
        {notification && (<div className="absolute top-5 right-5 z-50 animate-fade-in-down"><div className={`flex items-center p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{notification.type === 'success' ? <CheckCircleIcon className="h-6 w-6 mr-2" /> : <ExclamationCircleIcon className="h-6 w-6 mr-2" />}{notification.message}</div></div>)}
        <header className="flex items-center justify-between p-4 bg-white shadow-md w-full flex-shrink-0"><button onClick={() => setIsSidebarOpen(true)} className="p-2"><Bars3Icon className="h-8 w-8 text-gray-600" /></button><div className="text-center"><h1 className="text-xl font-semibold text-green-600">{selectedDriver ? selectedDriver.name : 'No Driver Selected'}</h1><p className="text-sm text-gray-500">Welcome, {session?.username || 'Manager'}</p></div><button onClick={handleLogout} className="text-sm text-gray-600 hover:text-indigo-600 px-2 py-1">Logout</button></header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden"><div className="text-center"><button onClick={() => setIsNumberPadVisible(!isNumberPadVisible)} className="w-48 h-48 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:transform-none" disabled={!selectedDriver}><span className="text-7xl font-light tracking-tighter">{bottleCount}</span></button><p className="mt-4 text-gray-600 h-6">{selectedDriver ? (isNumberPadVisible ? (isEditMode ? 'Editing entry...' : 'Creating new entry...') : 'Tap to enter count') : 'Please select a driver'}</p></div></main>
        <footer className="w-full p-4 bg-white shadow-inner flex-shrink-0">
            {isNumberPadVisible && selectedDriver ? (<NumberPad onDigitClick={handleDigitClick} onDeleteClick={handleDeleteClick} />) : (
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <button onClick={handleEditClick} className="p-4 bg-gray-200 text-gray-800 rounded-lg text-lg font-semibold disabled:opacity-50" disabled={!lastEntry || isEditMode}>Edit Last Entry</button>
                <button onClick={handleSubmit} className="p-4 bg-green-600 text-white rounded-lg text-lg font-semibold disabled:opacity-50" disabled={!selectedDriver || bottleCount === '0' || submitLoading}>
                    {submitLoading ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
                </button>
            </div>
            )}
        </footer>
    </div>
  );
}
