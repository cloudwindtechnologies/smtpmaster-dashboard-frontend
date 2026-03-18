// app/edit-user/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  User,
  Save,
  X,
  CheckCircle,
  XCircle,
  ChevronDown,
  MapPin,
  Home,
  Globe as GlobeIcon,
  Building,
  Hash,
  Map,
  Server,
  ShoppingCart,
} from 'lucide-react';
import { token } from '../../common/http';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  mobile_country_code: string;
  vmta_pool_id: string;
  website: string;
  country: string;
  address: string;
  zipcode: string;
  iphostconfig: string;
  city: string;
  hmpiyt: string;
  hmcdh: string;
  sellonline: boolean;
  status: 'Active' | 'Inactive' | 'Suspended';
  emailNotificationEnabled: boolean;
  is_mobile_verify: boolean;
}

interface CountryCode {
  name: string;
  code: string; // expected like "+91"
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  if (params === null) return null;

  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const [userData, setUserData] = useState<UserData>({
    id: '',
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
    mobile_country_code: '+91',
    vmta_pool_id: '',
    website: '',
    country: 'India',
    address: '',
    zipcode: '',
    iphostconfig: '',
    city: '',
    hmpiyt: '',
    hmcdh: '',
    sellonline: false,
    status: 'Active',
    emailNotificationEnabled: true,
    is_mobile_verify: false,
  });

  // ✅ Store original loaded values for "dirty check"
  const [originalUserData, setOriginalUserData] = useState<UserData | null>(null);
  // ✅ Normalize object before compare (trim + consistent types)
  const normalizeUser = (u: UserData) => ({
    first_name: (u.first_name || '').trim(),
    last_name: (u.last_name || '').trim(),
    email: (u.email || '').trim().toLowerCase(),
    mobile: (u.mobile || '').trim(),
    mobile_country_code: (u.mobile_country_code || '').trim(),
    vmta_pool_id: (u.vmta_pool_id || '').trim(),
    website: (u.website || '').trim(),
    country: (u.country || '').trim(),
    address: (u.address || '').trim(),
    zipcode: (u.zipcode || '').trim(),
    iphostconfig: (u.iphostconfig || '').trim(),
    city: (u.city || '').trim(),
    hmpiyt: (u.hmpiyt || '').trim(),
    hmcdh: (u.hmcdh || '').trim(),
    sellonline: !!u.sellonline,
    status: u.status,
    emailNotificationEnabled: !!u.emailNotificationEnabled,
    is_mobile_verify: !!u.is_mobile_verify,
  });

  const isDirty = useMemo(() => {
    if (!originalUserData) return false;
    return (
      JSON.stringify(normalizeUser(userData)) !==
      JSON.stringify(normalizeUser(originalUserData))
    );
  }, [userData, originalUserData]);

  // Fetch country codes
  const fetchCountryCodes = async () => {
    try {
      setLoadingCountries(true);

      const response = await fetch(`/api/user-management/list-users/get-country-code`, {
        method:"GET",
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch country codes`);
      }

      const data = await response.json();

      const transformedData: CountryCode[] = (data.data || []).map((item: any) => ({
        name: item.name,
        code: item.code, // should be "+91"
      }));

      setCountryCodes(transformedData);

      // ✅ IMPORTANT: Do NOT overwrite loaded userData defaults if already present
      // Only set defaults if userData has empty values
      if (transformedData.length > 0) {
        setUserData((prev) => {
          const hasCountry = (prev.country || '').trim().length > 0;
          const hasCode = (prev.mobile_country_code || '').trim().length > 0;

          if (hasCountry && hasCode) return prev;

          const def =
            transformedData.find((c) => c.code === '+91') || transformedData[0];

          return {
            ...prev,
            mobile_country_code: hasCode ? prev.mobile_country_code : def.code,
            country: hasCountry ? prev.country : def.name,
          };
        });
      }
    } catch (err) {
      console.error('Error fetching country codes:', err);
      setCountryCodes([
        { name: 'India', code: '+91' },
        { name: 'United States', code: '+1' },
        { name: 'United Kingdom', code: '+44' },
        { name: 'Australia', code: '+61' },
      ]);
      setError('Failed to load country codes. Using default list.');
    } finally {
      setLoadingCountries(false);
    }
  };

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/user-management/list-users/get-one-user?id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token()}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch user data`);
        }

        const data = await response.json();
        console.log(data);
        
        const loaded: UserData = {
          id: data?.data?.id || '',
          first_name: data?.data?.first_name || '',
          last_name: data?.data?.last_name || '',
          email: data?.data?.email || '',
          mobile: data?.data?.mobile || '',
          mobile_country_code: data?.data?.mobile_country_code || '+91',
          vmta_pool_id: data?.data?.vmta_pool_id || '',
          website: data?.data?.website || '',
          country: data?.data?.country || 'India',
          address: data?.data?.address || '',
          zipcode: data?.data?.zipcode || '',
          iphostconfig: data?.data?.iphostconfig || '',
          city: data?.data?.city || '',
          hmpiyt: data?.data?.hmpiyt || '',
          hmcdh: data?.data?.hmcdh || '',
          sellonline: data?.data?.sellonline === "0"?false:true || false,
          status: data?.data?.status || 'Active',
          emailNotificationEnabled: data?.data?.email_notification_enabled !== false,
          is_mobile_verify: data?.data?.is_mobile_verify || false,
        };

        setUserData(loaded);
        setOriginalUserData(loaded); // ✅ baseline for dirty check
      } catch (err) {
        setError(
          `Failed to load user data: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
      fetchCountryCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Handle country code selection
  const handleCountryCodeChange = (selectedCode: string) => {
    const selectedCountry = countryCodes.find((country) => country.code === selectedCode);

    setUserData((prev) => ({
      ...prev,
      mobile_country_code: selectedCode,
      country: selectedCountry?.name || prev.country,
    }));
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setUserData((prev) => ({
        ...prev,
        [name]: checkbox.checked,
      }));
    } else {
      setUserData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ If nothing changed, don’t submit
    if (!isDirty) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        mobile: userData.mobile,
        mobile_country_code: userData.mobile_country_code,
        vmta_pool_id: userData.vmta_pool_id,
        website: userData.website,
        country: userData.country,
        address: userData.address,
        zipcode: userData.zipcode,
        iphostconfig: userData.iphostconfig,
        city: userData.city,
        hmpiyt: userData.hmpiyt,
        hmcdh: userData.hmcdh,
        sellonline: userData.sellonline,
        is_mobile_verify:userData.is_mobile_verify
        // status: userData.status,
      };
      console.log('submit data',submitData);
      
      const response = await fetch(`/api/user-management/list-users/edit-user?id=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(submitData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // If backend returns validation errors in "errors", show them clearly
        const msg =
          responseData?.message ||
          (responseData?.errors ? JSON.stringify(responseData.errors) : '') ||
          `HTTP ${response.status}: Failed to update user`;
        throw new Error(msg);
      }

      setSuccess('User updated successfully!');

      // ✅ After success, reset baseline so button becomes disabled again
      setOriginalUserData(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating user');
      console.error('Error updating user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Edit User</h1>
              <p className="text-gray-600 text-sm mt-0.5">
                Update user information and permissions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                ID: {userId}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                Status: {userData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 flex items-start gap-3">
            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 flex items-start gap-3">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-300" />

          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            {/* Personal Information Section */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* First Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gray-500" />
                      First Name *
                    </span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={userData.first_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter first name"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gray-500" />
                      Last Name *
                    </span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={userData.last_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter last name"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-500" />
                      Email *
                    </span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="user@example.com"
                  />
                </div>

                {/* Mobile Number with Country Code */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      Mobile Number *
                    </span>
                  </label>

                  <div className="flex items-stretch rounded-lg overflow-hidden border border-gray-300 bg-gray-50 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-orange-500 transition-all shadow-sm">
                    {/* Country Code Selector */}
                    <div className="relative group flex-shrink-0">
                      <select
                        name="mobile_country_code"
                        value={userData.mobile_country_code}
                        onChange={(e) => handleCountryCodeChange(e.target.value)}
                        disabled={loadingCountries}
                        className="appearance-none bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-2.5 text-sm outline-none cursor-pointer hover:from-gray-200 hover:to-gray-100 transition-all w-32 disabled:opacity-50"
                        title="Select country code"
                      >
                        {loadingCountries ? (
                          <option>Loading...</option>
                        ) : (
                          <>
                            <option value="" disabled>
                              Select code
                            </option>
                            {countryCodes.map((country, index) => (
                              <option key={`${country.code}-${index}`} value={country.code}>
                                {country.code} {country.name.substring(0, 10)}
                                {country.name.length > 10 ? '...' : ''}
                              </option>
                            ))}
                          </>
                        )}
                      </select>

                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        {loadingCountries ? (
                          <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-gray-600" />
                        )}
                      </div>
                    </div>

                    <div className="w-px bg-gray-300 my-2" />

                    <input
                      type="tel"
                      name="mobile"
                      value={userData.mobile}
                      onChange={handleInputChange}
                      required
                      className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent outline-none text-sm placeholder-gray-500"
                      placeholder="9876543210"
                    />
                  </div>

                  {!loadingCountries && userData.mobile_country_code && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="font-medium">
                        Selected: {userData.mobile_country_code}{' '}
                        {countryCodes.find((c) => c.code === userData.mobile_country_code)?.name ||
                          ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Business Information Section */}
            <div className="mb-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-500" />
                Business Information
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <GlobeIcon className="h-3.5 w-3.5 text-gray-500" />
                      Website
                    </span>
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={userData.website}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-gray-500" />
                      VMTA Pool ID
                    </span>
                  </label>
                  <input
                    type="text"
                    name="vmta_pool_id"
                    value={userData.vmta_pool_id}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter VMTA Pool ID"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">HMPIYT</label>
                  <input
                    type="text"
                    name="hmpiyt"
                    value={userData.hmpiyt}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter HMPIYT"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">HMCDH</label>
                  <input
                    type="text"
                    name="hmcdh"
                    value={userData.hmcdh}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter HMCDH"
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="mb-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                Location Information
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-gray-500" />
                      Country
                    </span>
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={userData.country}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter country"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Map className="h-3.5 w-3.5 text-gray-500" />
                      City
                    </span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={userData.city}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter city"
                  />
                </div>

                <div className="lg:col-span-2 space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5 text-gray-500" />
                      Address
                    </span>
                  </label>
                  <textarea
                    name="address"
                    value={userData.address}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm resize-none"
                    placeholder="Enter full address"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-gray-500" />
                      Zipcode
                    </span>
                  </label>
                  <input
                    type="text"
                    name="zipcode"
                    value={userData.zipcode}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter zipcode"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-gray-500" />
                      IP Host Config
                    </span>
                  </label>
                  <input
                    type="text"
                    name="iphostconfig"
                    value={userData.iphostconfig}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                    placeholder="Enter IP host configuration"
                  />
                </div>
              </div>
            </div>

            {/* Settings & Status */}
            <div className="mb-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                Settings & Status
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={userData.status}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Sell Online</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="sellonline"
                          checked={userData.sellonline}
                          onChange={() => setUserData((prev) => ({ ...prev, sellonline: true }))}
                          className="sr-only"
                        />
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            userData.sellonline ? 'border-orange-500' : 'border-gray-300'
                          }`}
                        >
                          {userData.sellonline && (
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                      <span className="text-gray-700 text-sm">Yes</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="sellonline"
                          checked={!userData.sellonline}
                          onChange={() => setUserData((prev) => ({ ...prev, sellonline: false }))}
                          className="sr-only"
                        />
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            !userData.sellonline ? 'border-orange-500' : 'border-gray-300'
                          }`}
                        >
                          {!userData.sellonline && (
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                      <span className="text-gray-700 text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Notification Enabled
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="emailNotificationEnabled"
                          checked={userData.emailNotificationEnabled}
                          onChange={() =>
                            setUserData((prev) => ({ ...prev, emailNotificationEnabled: true }))
                          }
                          className="sr-only"
                        />
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            userData.emailNotificationEnabled
                              ? 'border-orange-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {userData.emailNotificationEnabled && (
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                      <span className="text-gray-700 text-sm">Yes</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="emailNotificationEnabled"
                          checked={!userData.emailNotificationEnabled}
                          onChange={() =>
                            setUserData((prev) => ({ ...prev, emailNotificationEnabled: false }))
                          }
                          className="sr-only"
                        />
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            !userData.emailNotificationEnabled
                              ? 'border-orange-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {!userData.emailNotificationEnabled && (
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                      <span className="text-gray-700 text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Mobile Verified</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="is_mobile_verify"
                          checked={userData.is_mobile_verify}
                          onChange={() => setUserData((prev) => ({ ...prev, is_mobile_verify: true }))}
                          className="sr-only"
                        />
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            userData.is_mobile_verify ? 'border-orange-500' : 'border-gray-300'
                          }`}
                        >
                          {userData.is_mobile_verify && (
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                      <span className="text-gray-700 text-sm">Yes</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="is_mobile_verify"
                          checked={!userData.is_mobile_verify}
                          onChange={() => setUserData((prev) => ({ ...prev, is_mobile_verify: false }))}
                          className="sr-only"
                        />
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          !userData.is_mobile_verify ? 'border-orange-500' : 'border-gray-300'
                          }`}
                        >
                          {!userData.is_mobile_verify && (
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                      <span className="text-gray-700 text-sm">No</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all w-full sm:w-auto"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>

              <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={submitting || !isDirty}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium hover:from-orange-600 hover:to-orange-700 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update User
                    </>
                  )}
                </button>

                {!isDirty && !submitting && (
                  <span className="text-xs text-gray-500">No changes to update.</span>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
