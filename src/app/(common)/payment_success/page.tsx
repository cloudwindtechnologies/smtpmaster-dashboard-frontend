"use client";

import Header from '@/components/app_component/common/header';
import SidebarNav from '@/components/app_component/common/sidebar';
import SuperAdminSidebar from '@/components/app_component/common/super-admin-sidebar';
import { useUser } from '@/app/context/UserContext';
import { canAccessAdminShell } from '@/lib/auth';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { token } from '@/components/app_component/common/http';
import { pushToDataLayer } from '@/lib/gtm';
import { CheckCircle, ArrowRight, Home, Star } from 'lucide-react';
import Link from 'next/link';

type SuccessApiResponse = {
  code: number;
  message?: string;
  data?: {
    invoice_id: string;
    plan_id: number | string;
    plan_name: string;
    amount: number | string;
    tax: number | string;
    discount: number | string;
    currency: string;
    payment_method: string;
    status: string;
  };
};
  function PaymentSuccess() {
  const { user } = useUser();
  const [isAnimating, setIsAnimating] = useState(true);
  const [purchaseLoaded, setPurchaseLoaded] = useState(false);
  const pushedRef = useRef(false);

  const canUseAdminShell = canAccessAdminShell(user?.login_user_role_id);
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoice_id");

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!invoiceId || pushedRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/payment_success_details?invoice_id=${encodeURIComponent(invoiceId)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token()}`,
            },
            cache: "no-store",
          }
        );

        const json = (await res.json().catch(() => ({}))) as SuccessApiResponse;

        if (!res.ok || json?.code !== 200 || !json?.data) {
          throw new Error(json?.message || "Failed to load purchase details");
        }

        if (cancelled) return;

        const data = json.data;
        const amount = Number(data.amount || 0);
        const tax = Number(data.tax || 0);
        const discount = Number(data.discount || 0);
        const priceBeforeTax = Math.max(amount - tax, 0);

        pushToDataLayer({ ecommerce: null });

        pushToDataLayer({
          event: "purchase",
          ecommerce: {
            transaction_id: data.invoice_id,
            value: amount,
            tax: tax,
            currency: data.currency || "INR",
            items: [
              {
                item_id: String(data.plan_id || ""),
                item_name: data.plan_name || "Unknown Plan",
                item_category: "Email Plan",
                price: priceBeforeTax,
                quantity: 1,
                discount: discount,
              },
            ],
          },
          payment_method: data.payment_method || "",
        });

        pushedRef.current = true;
        setPurchaseLoaded(true);
      } catch (error) {
        console.error("Purchase tracking failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const confettiPositions = [
    { left: '10%', top: '20%', delay: '0s' },
    { left: '25%', top: '40%', delay: '0.2s' },
    { left: '40%', top: '15%', delay: '0.4s' },
    { left: '55%', top: '70%', delay: '0.6s' },
    { left: '70%', top: '30%', delay: '0.8s' },
    { left: '85%', top: '50%', delay: '1.0s' },
    { left: '15%', top: '80%', delay: '1.2s' },
    { left: '30%', top: '60%', delay: '1.4s' },
    { left: '45%', top: '90%', delay: '1.6s' },
    { left: '60%', top: '10%', delay: '1.8s' },
    { left: '75%', top: '45%', delay: '2.0s' },
    { left: '90%', top: '75%', delay: '2.2s' },
    { left: '5%', top: '55%', delay: '2.4s' },
    { left: '20%', top: '25%', delay: '2.6s' },
    { left: '35%', top: '85%', delay: '2.8s' },
    { left: '50%', top: '35%', delay: '3.0s' },
    { left: '65%', top: '65%', delay: '3.2s' },
    { left: '80%', top: '95%', delay: '3.4s' },
    { left: '95%', top: '5%', delay: '3.6s' },
    { left: '12%', top: '48%', delay: '3.8s' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

        {isAnimating && confettiPositions.map((pos, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-orange-500 rounded-full animate-confetti"
            style={{
              left: pos.left,
              top: pos.top,
              animationDelay: pos.delay,
              opacity: 0.6
            }}
          />
        ))}
      </div>

      <div className="flex h-full relative">
        <div className="hidden lg:block w-64 h-full overflow-y-auto overflow-x-hidden bg-white/50 backdrop-blur-sm border-r border-orange-100">
          {canUseAdminShell ? <SuperAdminSidebar /> : <SidebarNav />}
        </div>

        <div className="flex-1 h-full overflow-y-auto overflow-x-hidden">
          <div className="sticky top-0 z-20">
            <Header />
          </div>

          <main className="p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-600 rounded-[2rem] blur-xl opacity-20 animate-pulse"></div>

                <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-orange-100">
                  <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 p-8 lg:p-12 overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute -inset-[10px] bg-white/20 rotate-12 transform scale-150 animate-wave"></div>
                    </div>

                    <div className="relative text-center">
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
                          <div className="relative bg-white/20 rounded-full p-3 animate-bounce">
                            <div className="bg-white rounded-full p-4">
                              <CheckCircle className="w-16 h-16 text-orange-500 animate-scale-check" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4 animate-slide-down">
                        Payment Successful!
                      </h1>

                      <p className="text-orange-100 text-lg lg:text-xl max-w-2xl mx-auto animate-slide-up">
                        Thank you for your purchase! Your transaction has been completed successfully.
                      </p>

                      {purchaseLoaded && (
                        <div className="mt-4 text-sm text-white/90">
                          Purchase tracking recorded
                        </div>
                      )}

                      <div className="mt-6 inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                        <span className="text-white font-medium">Transaction Completed</span>
                        <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                      </div>
                    </div>
                  </div>

                  <div className="p-8 lg:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <Link href="/" className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 rounded-2xl p-6 transition-all duration-300 hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <Home className="w-8 h-8 text-orange-500 mb-3 group-hover:rotate-12 transition-transform" />
                        <h3 className="font-semibold text-gray-800">Dashboard</h3>
                        <p className="text-sm text-gray-500 mt-1">Manage your account</p>
                        <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-orange-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                      </Link>

                      <Link href="/order-history" className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 rounded-2xl p-6 transition-all duration-300 hover:scale-105">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <svg className="w-8 h-8 text-orange-500 mb-3 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="font-semibold text-gray-800">Invoice</h3>
                        <p className="text-sm text-gray-500 mt-1">Download receipt</p>
                        <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-orange-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                      </Link>

                      <Link
                        href="https://smtpmaster.tawk.help/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 rounded-2xl p-6 transition-all duration-300 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                        <svg className="w-8 h-8 text-orange-500 mb-3 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <h3 className="font-semibold text-gray-800">Support</h3>
                        <p className="text-sm text-gray-500 mt-1">24/7 assistance</p>
                        <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-orange-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                      </Link>
                    </div>

                    <div className="mt-8 text-center">
                      <p className="text-sm text-gray-500 mb-3">Join thousands of satisfied customers</p>
                      <div className="flex justify-center items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ))}
                        <span className="text-gray-600 ml-2">4.9/5 rating</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.8s ease-out; }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.8s ease-out 0.3s both; }
        @keyframes scale-check {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-scale-check { animation: scale-check 0.6s ease-out 0.2s both; }
        @keyframes wave {
          0% { transform: rotate(12deg) translateY(0); }
          50% { transform: rotate(12deg) translateY(-20px); }
          100% { transform: rotate(12deg) translateY(0); }
        }
        .animate-wave { animation: wave 3s ease-in-out infinite; }
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti 3s ease-in-out forwards; }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage(){
    return ( <Suspense fallback={<div>Loading payment...</div>}>
                <PaymentSuccess />
            </Suspense>)
}