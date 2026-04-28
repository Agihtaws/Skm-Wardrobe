"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, MapPin, ShoppingBag, LogOut,
  Trash2, Plus, CheckCircle,
  Loader2, Save,
} from "lucide-react";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { Address } from "@/types/database";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const EMPTY_ADDR = {
  full_name: "", phone: "", line1: "", line2: "",
  city: "", state: "Tamil Nadu", pincode: "", is_default: false,
};

interface Props {
  user:             { id: string; email: string };
  initialProfile:   any;
  initialAddresses: Address[];
}

export default function ProfileClient({ user, initialProfile, initialAddresses }: Props) {
  const router = useRouter();
  const { setProfile } = useAuthStore();

  const [activeTab, setActiveTab]   = useState<"profile" | "addresses">("profile");
  const [addresses, setAddresses]   = useState<Address[]>(initialAddresses);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showAddrForm, setShowAddrForm]   = useState(false);
  const [savingAddr, setSavingAddr]       = useState(false);
  const [addrForm, setAddrForm]           = useState(EMPTY_ADDR);

  const [nameEdit, setNameEdit] = useState(initialProfile?.full_name ?? "");

  const displayName = nameEdit || user.email.split("@")[0];
  const initials    = displayName.slice(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res  = await fetch("/api/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ full_name: nameEdit }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Failed to save");
      } else {
        setProfile(json.data);
        toast.success("Profile updated!");
      }
    } catch {
      toast.error("Something went wrong");
    }
    setSavingProfile(false);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrForm.full_name || !addrForm.phone || !addrForm.line1 || !addrForm.city || !addrForm.pincode)
      return toast.error("Fill all required fields");
    if (!/^\d{10}$/.test(addrForm.phone))  return toast.error("Enter valid 10-digit phone");
    if (!/^\d{6}$/.test(addrForm.pincode)) return toast.error("Enter valid 6-digit pincode");

    setSavingAddr(true);
    const res  = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addrForm),
    });
    const json = await res.json();
    setSavingAddr(false);

    if (!json.success) return toast.error(json.error);
    setAddresses((prev) => [json.data, ...prev]);
    setShowAddrForm(false);
    setAddrForm(EMPTY_ADDR);
    toast.success("Address added");
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    const res  = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast.success("Address deleted");
  };

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
    toast.success("Signed out");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-700 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-lg truncate">{displayName}</p>
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Quick links */}
      <Link
        href="/orders"
        className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-4 hover:border-pink-200 hover:shadow-sm transition-all mb-5"
      >
        <div className="w-9 h-9 bg-pink-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={18} className="text-pink-600" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">My Orders</p>
          <p className="text-xs text-gray-400">Track and manage your orders</p>
        </div>
        <ChevronRight size={16} className="text-gray-300" />
      </Link>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
        {[
          { key: "profile",   label: "Profile",   icon: User   },
          { key: "addresses", label: "Addresses", icon: MapPin },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Full name
              </label>
              <input
                value={nameEdit}
                onChange={(e) => setNameEdit(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Email address
              </label>
              <input
                value={user.email}
                disabled
                className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors"
            >
              {savingProfile
                ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                : <><Save size={15} /> Save Changes</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Addresses tab ── */}
      {activeTab === "addresses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Saved Addresses</h2>
            <button
              onClick={() => setShowAddrForm((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-pink-600 font-semibold hover:text-pink-700"
            >
              <Plus size={15} />
              {showAddrForm ? "Cancel" : "Add New"}
            </button>
          </div>

          {/* Add form */}
          {showAddrForm && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">New Address</h3>
              <form onSubmit={handleSaveAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recipient name *</label>
                  <input value={addrForm.full_name}
                    onChange={(e) => setAddrForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
                  <input value={addrForm.phone} maxLength={10}
                    onChange={(e) => setAddrForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address line 1 *</label>
                  <input value={addrForm.line1}
                    onChange={(e) => setAddrForm((f) => ({ ...f, line1: e.target.value }))}
                    placeholder="House no., Street, Area"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address line 2 <span className="text-gray-400">(optional)</span>
                  </label>
                  <input value={addrForm.line2}
                    onChange={(e) => setAddrForm((f) => ({ ...f, line2: e.target.value }))}
                    placeholder="Landmark, Apartment"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                  <input value={addrForm.city}
                    onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pincode *</label>
                  <input value={addrForm.pincode} maxLength={6}
                    onChange={(e) => setAddrForm((f) => ({ ...f, pincode: e.target.value }))}
                    placeholder="6-digit pincode"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                  <select value={addrForm.state}
                    onChange={(e) => setAddrForm((f) => ({ ...f, state: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={addrForm.is_default}
                      onChange={(e) => setAddrForm((f) => ({ ...f, is_default: e.target.checked }))}
                      className="accent-pink-600"
                    />
                    <span className="text-sm text-gray-600">Set as default address</span>
                  </label>
                </div>
                <div className="sm:col-span-2 flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAddrForm(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingAddr}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
                    {savingAddr ? <Loader2 size={14} className="animate-spin" /> : null}
                    {savingAddr ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Address list */}
          {addresses.length === 0 && !showAddrForm ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <MapPin size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No saved addresses</p>
              <button onClick={() => setShowAddrForm(true)}
                className="mt-3 text-sm text-pink-600 font-semibold hover:underline">
                Add your first address
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{addr.full_name}</p>
                        <p className="text-xs text-gray-500">{addr.phone}</p>
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            <CheckCircle size={9} /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""},
                        {" "}{addr.city}, {addr.state} — {addr.pincode}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}