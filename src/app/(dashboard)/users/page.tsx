"use client";

import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PlusIcon, UserCircleIcon, PencilSquareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type Manager = {
  id: string;
  username: string | null;
};

export default function UsersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPin, setNewPin] = useState('');
  const [addModalLoading, setAddModalLoading] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingManager, setDeletingManager] = useState<Manager | null>(null);
  const [deleteModalLoading, setDeleteModalLoading] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const fetchManagers = async () => {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found.");
      const { data: profile, error: pError } = await supabase.from('profiles').select('plant_id').eq('id', user.id).single();
      if (pError) throw new Error(`Could not fetch profile: ${pError.message}`);
      if (!profile?.plant_id) throw new Error("No plant associated.");
      const { data: mData, error: mError } = await supabase.from('profiles').select('id, username').eq('plant_id', profile.plant_id).eq('role', 'manager').order('username');
      if (mError) throw new Error(`Could not fetch managers: ${mError.message}`);
      setManagers(mData || []);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleAddManager = async (e: FormEvent) => {
    e.preventDefault(); setAddModalLoading(true); setAddModalError(null);
    if (!newUsername.trim() || !newPin.trim()) { setAddModalError("Username and PIN are required."); setAddModalLoading(false); return; }
    if (!/^\d{6}$/.test(newPin)) { setAddModalError("PIN must be exactly 6 digits."); setAddModalLoading(false); return; }
    try {
      const response = await fetch('/api/managers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: newUsername, pin: newPin }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed.');
      setManagers(prev => [...prev, result].sort((a, b) => (a.username || '').localeCompare(b.username || '')));
      setIsAddModalOpen(false); setNewUsername(''); setNewPin('');
    } catch (err: any) { setAddModalError(err.message); } finally { setAddModalLoading(false); }
  };

  const openEditModal = (manager: Manager) => {
    setEditingManager(manager); setEditUsername(manager.username || ''); setEditPin(''); setEditModalError(null); setIsEditModalOpen(true);
  };

  const handleEditManager = async (e: FormEvent) => {
    e.preventDefault(); if (!editingManager) return;
    setEditModalLoading(true); setEditModalError(null);
    const payload: { id: string; username?: string; pin?: string } = { id: editingManager.id };
    if (editUsername && editUsername.trim() !== editingManager.username) payload.username = editUsername.trim();
    if (editPin) { if (!/^\d{6}$/.test(editPin)) { setEditModalError("PIN must be 6 digits."); setEditModalLoading(false); return; } payload.pin = editPin; }
    if (!payload.username && !payload.pin) { setIsEditModalOpen(false); setEditModalLoading(false); return; }
    try {
      const response = await fetch('/api/managers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed.');
      setManagers(prev => prev.map(m => (m.id === result.id ? result : m)).sort((a, b) => (a.username || '').localeCompare(b.username || '')));
      setIsEditModalOpen(false); setEditingManager(null);
    } catch (err: any) { setEditModalError(err.message); } finally { setEditModalLoading(false); }
  };

  const openDeleteModal = (manager: Manager) => {
    setDeletingManager(manager);
    setDeleteModalError(null);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteManager = async () => {
    if (!deletingManager) return;
    setDeleteModalLoading(true);
    setDeleteModalError(null);
    try {
      const response = await fetch(`/api/managers?id=${deletingManager.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete manager.');
      setManagers(prev => prev.filter(m => m.id !== deletingManager.id));
      setIsDeleteModalOpen(false);
      setDeletingManager(null);
    } catch (err: any) {
      setDeleteModalError(err.message);
    } finally {
      setDeleteModalLoading(false);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center"><div className="sm:flex-auto"><h1 className="text-2xl font-semibold leading-6 text-gray-900">User Management</h1><p className="mt-2 text-sm text-gray-700">A list of all the 'manager' users in your plant.</p></div><div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none"><button type="button" onClick={() => { setIsAddModalOpen(true); setAddModalError(null); setNewUsername(''); setNewPin(''); }} className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"><PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />Add User</button></div></div>
      <div className="mt-8 flow-root"><div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8"><div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8"><table className="min-w-full divide-y divide-gray-300"><thead><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Username</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-gray-200 bg-white">{loading ? (<tr><td colSpan={2} className="text-center py-4 text-gray-500">Loading...</td></tr>) : error ? (<tr><td colSpan={2} className="text-center py-4 text-red-600">Error: {error}</td></tr>) : managers.length === 0 ? (<tr><td colSpan={2} className="text-center py-4 text-gray-500">No managers found.</td></tr>) : (managers.map((manager) => (<tr key={manager.id}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{manager.username}</td><td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0 space-x-4"><button onClick={() => openEditModal(manager)} className="text-indigo-600 hover:text-indigo-900">Edit</button><button onClick={() => openDeleteModal(manager)} className="text-red-600 hover:text-red-900">Delete</button></td></tr>)))}</tbody></table></div></div></div>
      {isAddModalOpen && (<div className="relative z-10"><div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div><div className="fixed inset-0 z-10 overflow-y-auto"><div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"><div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"><form onSubmit={handleAddManager}><div><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100"><UserCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" /></div><div className="mt-3 text-center sm:mt-5"><h3 className="text-base font-semibold leading-6 text-gray-900">Add a new manager</h3><div className="mt-4 space-y-4 text-left"><div><label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">Username</label><input type="text" name="username" id="username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="e.g. manager01"/></div><div><label htmlFor="pin" className="block text-sm font-medium leading-6 text-gray-900">6-Digit PIN</label><input type="password" name="pin" id="pin" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={6} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="••••••"/></div>{addModalError && <p className="text-sm text-red-600">{addModalError}</p>}</div></div></div><div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3"><button type="submit" disabled={addModalLoading} className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:col-start-2 disabled:opacity-50">{addModalLoading ? 'Adding...' : 'Add User'}</button><button type="button" onClick={() => setIsAddModalOpen(false)} disabled={addModalLoading} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0">Cancel</button></div></form></div></div></div></div>)}
      {isEditModalOpen && editingManager && (<div className="relative z-10"><div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div><div className="fixed inset-0 z-10 overflow-y-auto"><div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"><div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"><form onSubmit={handleEditManager}><div><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100"><PencilSquareIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" /></div><div className="mt-3 text-center sm:mt-5"><h3 className="text-base font-semibold leading-6 text-gray-900">Edit Manager</h3><div className="mt-4 space-y-4 text-left"><div><label htmlFor="edit-username" className="block text-sm font-medium leading-6 text-gray-900">Username</label><input type="text" id="edit-username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"/></div><div><label htmlFor="edit-pin" className="block text-sm font-medium leading-6 text-gray-900">New 6-Digit PIN (optional)</label><input type="password" id="edit-pin" value={editPin} onChange={(e) => setEditPin(e.target.value)} maxLength={6} className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Leave blank to keep current PIN"/></div>{editModalError && <p className="text-sm text-red-600">{editModalError}</p>}</div></div></div><div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3"><button type="submit" disabled={editModalLoading} className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:col-start-2 disabled:opacity-50">{editModalLoading ? 'Saving...' : 'Save Changes'}</button><button type="button" onClick={() => setIsEditModalOpen(false)} disabled={editModalLoading} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0">Cancel</button></div></form></div></div></div></div>)}
      {isDeleteModalOpen && deletingManager && (<div className="relative z-20"><div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div><div className="fixed inset-0 z-10 overflow-y-auto"><div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"><div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"><div className="sm:flex sm:items-start"><div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" /></div><div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left"><h3 className="text-base font-semibold leading-6 text-gray-900">Delete Manager</h3><div className="mt-2"><p className="text-sm text-gray-500">Are you sure you want to delete the user "{deletingManager.username}"? This action cannot be undone.</p></div>{deleteModalError && <p className="mt-2 text-sm text-red-600">{deleteModalError}</p>}</div></div><div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse"><button type="button" onClick={handleDeleteManager} disabled={deleteModalLoading} className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50">{deleteModalLoading ? "Deleting..." : "Delete"}</button><button type="button" onClick={() => setIsDeleteModalOpen(false)} disabled={deleteModalLoading} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">Cancel</button></div></div></div></div></div>)}
    </div>
  );
}
