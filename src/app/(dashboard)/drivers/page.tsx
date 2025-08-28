"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export type Driver = {
  id: string;
  created_at: string;
  name: string;
  plant_id: string;
  is_active: boolean;
};

export default function DriversPage() {
  // Page state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plantId, setPlantId] = useState<string | null>(null);

  // UI state
  const [showInactive, setShowInactive] = useState(false);

  // Add Driver Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [addModalLoading, setAddModalLoading] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [driverToToggle, setDriverToToggle] = useState<Driver | null>(null);
  const [confirmModalLoading, setConfirmModalLoading] = useState(false);

  // Rate configuration state
  const [bottleRate, setBottleRate] = useState('');
  const [rateLoading, setRateLoading] = useState(false);
  const [rateMessage, setRateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);


  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not found. Please log in again.");

        const { data: profile, error: profileError } = await supabase.from('profiles').select('plant_id').eq('id', user.id).single();
        if (profileError) throw new Error(`Could not fetch user profile: ${profileError.message}`);
        if (!profile || !profile.plant_id) throw new Error("No plant associated with this user.");
        setPlantId(profile.plant_id);

        const { data: plantData, error: plantError } = await supabase.from('plants').select('bottle_rate').eq('id', profile.plant_id).single();
        if (plantError) throw new Error(`Could not fetch plant data: ${plantError.message}`);
        if (plantData) setBottleRate(plantData.bottle_rate.toString());

        const { data: driversData, error: driversError } = await supabase.from('drivers').select('*').eq('plant_id', profile.plant_id).order('name', { ascending: true });
        if (driversError) throw new Error(`Could not fetch drivers: ${driversError.message}`);
        setDrivers(driversData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleAddDriver = async () => {
    if (!newDriverName.trim()) { setAddModalError("Driver name cannot be empty."); return; }
    if (!plantId) { setAddModalError("Could not determine your plant. Please refresh the page."); return; }
    setAddModalLoading(true);
    setAddModalError(null);
    try {
      const { data: newDriver, error } = await supabase.from('drivers').insert({ name: newDriverName.trim(), plant_id: plantId }).select().single();
      if (error) throw error;
      if (newDriver) setDrivers(prev => [...prev, newDriver].sort((a, b) => a.name.localeCompare(b.name)));
      setIsAddModalOpen(false);
      setNewDriverName('');
    } catch (err: any) {
      setAddModalError(err.message);
    } finally {
      setAddModalLoading(false);
    }
  };

  const updateDriverStatus = async (driver: Driver, newStatus: boolean) => {
    setConfirmModalLoading(true);
    const { data, error } = await supabase.from('drivers').update({ is_active: newStatus }).eq('id', driver.id).select().single();
    if (error) {
      setError("Failed to update driver status. Please try again.");
    } else if (data) {
      setDrivers(current => current.map(d => (d.id === data.id ? data : d)));
    }
    setConfirmModalLoading(false);
    setIsConfirmModalOpen(false);
    setDriverToToggle(null);
  };

  const initiateToggleStatus = (driver: Driver) => {
    if (driver.is_active) {
      setDriverToToggle(driver);
      setIsConfirmModalOpen(true);
    } else {
      updateDriverStatus(driver, true);
    }
  };

  const handleConfirmToggle = () => {
    if (driverToToggle) {
      updateDriverStatus(driverToToggle, false);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRateLoading(true);
    setRateMessage(null);

    const rateAsNumber = parseFloat(bottleRate);
    if (isNaN(rateAsNumber) || rateAsNumber < 0) {
      setRateMessage({ type: 'error', text: 'Please enter a valid, non-negative number for the rate.' });
      setRateLoading(false);
      return;
    }

    const { error } = await supabase.from('plants').update({ bottle_rate: rateAsNumber }).eq('id', plantId);
    if (error) {
      setRateMessage({ type: 'error', text: `Failed to update rate: ${error.message}` });
    } else {
      setRateMessage({ type: 'success', text: 'Rate updated successfully!' });
    }
    setRateLoading(false);
  };

  const filteredDrivers = drivers.filter(driver => showInactive || driver.is_active);

  return (
    <div>
      {/* Page Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Driver Management</h1>
          <p className="mt-2 text-sm text-gray-700">A list of all the drivers in your plant including their name and status.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button type="button" onClick={() => { setIsAddModalOpen(true); setAddModalError(null); setNewDriverName(''); }} className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Add Driver
          </button>
        </div>
      </div>

      {/* Rate Configuration Section */}
      <div className="mt-10 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">Rate Configuration</h2>
        <p className="mt-1 text-sm text-gray-600">Set the default 20L bottle rate for the entire plant.</p>
        <form onSubmit={handleUpdateRate} className="mt-4 flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <label htmlFor="bottle-rate" className="sr-only">Bottle Rate</label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">₹</span></div>
              <input type="number" name="bottle-rate" id="bottle-rate" value={bottleRate} onChange={(e) => setBottleRate(e.target.value)} className="block w-full rounded-md border-0 py-1.5 pl-7 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="6.00" step="0.01" min="0"/>
            </div>
          </div>
          <button type="submit" disabled={rateLoading} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
            {rateLoading ? 'Saving...' : 'Save Rate'}
          </button>
        </form>
        {rateMessage && (<p className={`mt-2 text-sm ${rateMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{rateMessage.text}</p>)}
      </div>

      {/* Table and Controls */}
      <div className="mt-8 flow-root">
        <div className="flex justify-end items-center mb-4"><label htmlFor="show-inactive" className="mr-2 text-sm font-medium text-gray-700">Show Inactive Drivers</label><button onClick={() => setShowInactive(!showInactive)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${showInactive ? 'bg-indigo-600' : 'bg-gray-200'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showInactive ? 'translate-x-5' : 'translate-x-0'}`}/></button></div>
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Name</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (<tr><td colSpan={3} className="text-center py-4 text-gray-500">Loading...</td></tr>) : error ? (<tr><td colSpan={3} className="text-center py-4 text-red-600">Error: {error}</td></tr>) : filteredDrivers.length === 0 ? (<tr><td colSpan={3} className="text-center py-4 text-gray-500">{showInactive ? 'No drivers found.' : 'No active drivers found.'}</td></tr>) : (
                  filteredDrivers.map((driver) => (<tr key={driver.id}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{driver.name}</td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500"><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{driver.is_active ? 'Active' : 'Inactive'}</span></td><td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0"><button onClick={() => initiateToggleStatus(driver)} className="text-indigo-600 hover:text-indigo-900">{driver.is_active ? 'Deactivate' : 'Activate'}</button></td></tr>)))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Driver Modal */}
      {isAddModalOpen && (<div className="relative z-10"><div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div><div className="fixed inset-0 z-10 overflow-y-auto"><div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"><div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"><form onSubmit={(e) => { e.preventDefault(); handleAddDriver(); }}><div><div className="mt-3 text-center sm:mt-5"><h3 className="text-base font-semibold leading-6 text-gray-900">Add a new driver</h3><div className="mt-2"><p className="text-sm text-gray-500">Enter the name of the driver to add them to your plant.</p><input type="text" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} className="mt-4 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="e.g. John Doe"/></div>{addModalError && <p className="mt-2 text-left text-sm text-red-600">{addModalError}</p>}</div></div><div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3"><button type="submit" disabled={addModalLoading} className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50">{addModalLoading ? 'Adding...' : 'Add Driver'}</button><button type="button" onClick={() => setIsAddModalOpen(false)} disabled={addModalLoading} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0">Cancel</button></div></form></div></div></div></div>)}

      {/* Deactivate Confirmation Modal */}
      {isConfirmModalOpen && driverToToggle && (<div className="relative z-20"><div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div><div className="fixed inset-0 z-10 overflow-y-auto"><div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"><div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"><div className="sm:flex sm:items-start"><div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" /></div><div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left"><h3 className="text-base font-semibold leading-6 text-gray-900">Deactivate Driver</h3><div className="mt-2"><p className="text-sm text-gray-500">Are you sure you want to deactivate {driverToToggle.name}? This will hide them from active lists but preserve all historical data.</p></div></div></div><div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse"><button type="button" onClick={handleConfirmToggle} disabled={confirmModalLoading} className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50">{confirmModalLoading ? "Deactivating..." : "Deactivate"}</button><button type="button" onClick={() => setIsConfirmModalOpen(false)} disabled={confirmModalLoading} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">Cancel</button></div></div></div></div></div>)}
    </div>
  );
}
