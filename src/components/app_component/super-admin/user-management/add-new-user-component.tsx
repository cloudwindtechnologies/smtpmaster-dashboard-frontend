"use client";

import React, { useState } from "react";

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-gray-800">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="mt-2 p-3 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Button({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center px-6 py-2 text-white font-semibold rounded-md ${className}`}
    >
      {children}
    </button>
  );
}

export default function AddUserForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const handleAddUser = () => {
    // Logic to add user goes here (e.g., API call)
    console.log({ firstName, lastName, email, mobile });
    alert("User added (demo). Connect to API.");
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Add New User</h1>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input label="First Name" value={firstName} onChange={setFirstName} placeholder="Enter first name" />
            <Input label="Last Name" value={lastName} onChange={setLastName} placeholder="Enter last name" />
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="Enter email" />
            <Input label="Mobile No" value={mobile} onChange={setMobile} placeholder="Enter mobile number" />
          </div>
          <div className="mt-6 flex justify-between">
            <Button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700">
              Add New User
            </Button>
            <Button onClick={() => console.log("All Users List")} className="bg-green-600 hover:bg-green-700">
              All Users List
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
