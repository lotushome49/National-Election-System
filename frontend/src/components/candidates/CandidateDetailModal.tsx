import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Candidate } from '../../types/election';

interface CandidateDetailModalProps {
  candidate: Candidate;
  onClose: () => void;
  t: (key: string) => string;
}

export function CandidateDetailModal({ candidate, onClose, t }: CandidateDetailModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-48 bg-election-dark">
          {candidate.photoUrl && (
            <img
              src={candidate.photoUrl}
              alt={candidate.name}
              className="w-full h-full object-cover opacity-60"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute -bottom-12 left-8">
            <div className="bg-white p-1 rounded-2xl shadow-xl overflow-hidden">
              {candidate.photoUrl ? (
                <img
                  src={candidate.photoUrl}
                  alt={candidate.name}
                  className="w-24 h-24 object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-white p-3 text-5xl">{candidate.symbol}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all backdrop-blur-md"
          >
            <X size={20} />
          </button>
        </div>

        <div className="pt-16 pb-8 px-8">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-slate-900">{candidate.name}</h3>
            <p className="text-election-blue font-bold uppercase tracking-widest text-xs mt-1">{candidate.party}</p>
          </div>

          <div className="space-y-6 overflow-y-auto max-h-[50vh] pr-4 custom-scrollbar">
            <section>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('biography')}</h4>
              <p className="text-slate-600 leading-relaxed text-sm">{candidate.bio}</p>
            </section>

            <section>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('manifesto')}</h4>
              <p className="text-slate-600 leading-relaxed text-sm italic">"{candidate.manifesto}"</p>
            </section>

            <section>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('platform')}</h4>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-slate-700 font-medium text-sm">{candidate.platform}</p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-election-dark text-white rounded-xl font-bold hover:bg-slate-800 transition-all transition-all"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
