'use client';

import React, { useState } from 'react';
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";

const Social = () => {
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCloseModal = () => {
    setShowGuestModal(false);
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signIn("guest", { 
        callbackUrl: "/",
        redirect: true 
      });
      
      if (result?.error) {
        toast.error("Gagal login sebagai guest. Silakan coba lagi.");
      } else {
        toast.success("Berhasil login sebagai guest!");
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error saat guest login:", error);
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const modalTitle = (
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md">
        <Icon icon="solar:user-circle-gear-duotone" className="text-xl" />
      </div>
      <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
        Login sebagai Guest
      </span>
    </div>
  );

  return (
    <>
      <div className="w-full text-center">
        <Button
          onClick={() => setShowGuestModal(true)}
          className="w-auto text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-md hover:shadow-lg transition duration-300 py-2.5 px-6 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2"
          type="button"
        >
          <Icon icon="solar:user-guest-duotone" className="text-xl" />
          <span>Login sebagai Guest</span>
        </Button>
      </div>

      <Modal
        title={modalTitle}
        activeModal={showGuestModal}
        onClose={handleCloseModal}
        className="max-w-md border border-teal-500/50 dark:border-teal-600/70 rounded-xl shadow-lg bg-white text-slate-800 dark:bg-slate-800/50 dark:text-slate-100 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80"
      >
        <div className="border-t border-slate-200 dark:border-slate-700/60 mt-4 pt-4 md:mt-5 md:pt-5">
          <div className="space-y-5 px-4 pb-4 md:px-6 md:pb-6 text-sm text-slate-700 dark:text-slate-300">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border-2 border-teal-500/30">
                <Icon icon="solar:user-guest-duotone" className="text-5xl text-teal-600 dark:text-teal-400" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                  Mode Guest
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Anda akan login sebagai pengguna tamu dengan akses terbatas. Data Anda tidak akan disimpan secara permanen.
                </p>
              </div>

              <div className="bg-slate-100/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-start space-x-3 text-left">
                  <Icon icon="solar:info-circle-duotone" className="text-xl text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p>• Tidak perlu registrasi atau login</p>
                    <p>• Akses fitur terbatas</p>
                    <p>• Data akan hilang setelah logout</p>
                    <p>• Cocok untuk mencoba aplikasi</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <Button
                onClick={handleCloseModal}
                className="w-auto text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold rounded-md shadow-sm hover:shadow-md transition duration-300 text-sm px-6 py-2.5"
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                onClick={handleGuestLogin}
                className="w-auto text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-slate-900 font-semibold rounded-md shadow-md hover:shadow-lg transition duration-300 text-sm px-6 py-2.5 flex items-center justify-center space-x-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Icon icon="svg-spinners:180-ring" className="text-lg" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="solar:login-3-duotone" className="text-lg" />
                    <span>Lanjutkan sebagai Guest</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Social;