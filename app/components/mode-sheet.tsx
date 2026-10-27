"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Sparkles, X } from "lucide-react";
import { Mode } from "@/lib/use-couple-profile";

export const MODES = [
  { id: "together" as Mode, label: "Together", note: "Same place, same rhythm",   icon: Heart },
  { id: "on_call"  as Mode, label: "On call",  note: "Close, even from far away", icon: MessageCircle },
  { id: "bored"    as Mode, label: "Bored",    note: "Make something happen",      icon: Sparkles },
];

interface ModeSheetProps {
  open: boolean;
  onClose: () => void;
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
}

export function ModeSheet({ open, onClose, currentMode, onSelectMode }: ModeSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mode-sheet-overlay"
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
        >
          {/* Backdrop blur layer */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" />

          {/* Modal Card */}
          <motion.div
            className="glass relative z-10 w-full max-w-md p-6"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex justify-between">
              <div>
                <p className="eyebrow">your mode</p>
                <h2 className="font-display text-2xl font-bold">How are you two?</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {MODES.map(({ id, label, note, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectMode(id)}
                  className={`mode-option ${currentMode === id ? "selected" : ""}`}
                >
                  <span className={`mode-option-icon ${id}`}><Icon size={20} /></span>
                  <span><strong>{label}</strong><small>{note}</small></span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
