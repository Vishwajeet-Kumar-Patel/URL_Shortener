"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

type FunnelProgress = {
  currentStep: number;
  completedSteps: number[];
  progress: number;
  shortCode: string;
};

const verificationTasks = [
  {
    id: 1,
    question: "What was the discount percentage mentioned in the previous step?",
    options: ["25%", "50%", "75%", "100%"],
    correct: 1
  },
  {
    id: 2,
    question: "How long was the free trial period?",
    options: ["7 days", "14 days", "30 days", "60 days"],
    correct: 2
  },
  {
    id: 3,
    question: "Was there a cancellation fee mentioned?",
    options: ["Yes, 25%", "No, cancel anytime", "Only after 6 months", "Not mentioned"],
    correct: 1
  }
];

export default function FunnelStep4Page() {
  const params = useParams();
  const router = useRouter();
  const sessionId = String(params.sessionId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FunnelProgress | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await apiRequest<FunnelProgress>(`/redirect/funnel/progress/${sessionId}`, {
          method: "GET"
        });
        setProgress(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [sessionId]);

  const currentTask = verificationTasks[currentQuestionIndex];
  const isAnswered = currentQuestionIndex < selectedAnswers.length;

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < verificationTasks.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleVerify();
    }
  };

  const handleVerify = async () => {
    // Check if all answers are correct
    const allCorrect = selectedAnswers.every(
      (answer, idx) => answer === verificationTasks[idx].correct
    );

    if (!allCorrect) {
      setError("Some answers were incorrect. Please try again.");
      setSelectedAnswers([]);
      setCurrentQuestionIndex(0);
      return;
    }

    setVerified(true);

    try {
      const result = await apiRequest<{ isValid: boolean; nextStep: number; message: string }>(
        `/redirect/funnel/validate-step/${sessionId}`,
        {
          method: "POST",
          body: {
            currentStep: 4,
            verified: true
          }
        }
      );

      if (result.isValid) {
        setTimeout(() => {
          router.push(`/funnel/step-5/${sessionId}`);
        }, 1000);
      } else {
        setVerified(false);
        setError("Verification failed. Please try again.");
      }
    } catch (err) {
      setVerified(false);
      setError(err instanceof Error ? err.message : "Failed to verify");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full border-4 border-indigo-600 border-t-transparent h-8 w-8"></div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600 mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-xl font-semibold text-white">Verification Complete!</p>
          <p className="mt-2 text-slate-300">Preparing your final content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8 rounded-lg bg-slate-900 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress?.progress || 80}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress?.progress || 80}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-3xl font-bold text-white">Step 4: Verify Your Attention</h1>
          <p className="mt-4 text-slate-300 mb-8">
            Let's make sure you paid attention to the content. Answer a few quick questions.
          </p>

          {/* Question */}
          <div className="rounded-lg bg-slate-800 p-6 mb-8">
            <p className="text-sm text-slate-400 mb-4">
              Question {currentQuestionIndex + 1} of {verificationTasks.length}
            </p>
            <h2 className="text-lg font-semibold text-white mb-6">{currentTask.question}</h2>

            {/* Options */}
            <div className="space-y-3">
              {currentTask.options.map((option, idx) => (
                <label
                  key={idx}
                  className="flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: selectedAnswers[currentQuestionIndex] === idx ? "#4f46e5" : "#374151",
                    backgroundColor: selectedAnswers[currentQuestionIndex] === idx ? "rgba(79, 70, 229, 0.1)" : "transparent"
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={idx}
                    checked={selectedAnswers[currentQuestionIndex] === idx}
                    onChange={() => handleSelectAnswer(idx)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="ml-3 text-slate-300">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            {currentQuestionIndex > 0 && (
              <button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                className="flex-1 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isAnswered}
              className={`flex-1 rounded-lg px-6 py-3 font-semibold text-white transition-all ${
                isAnswered ? "bg-indigo-600 hover:bg-indigo-500" : "bg-slate-700 cursor-not-allowed opacity-50"
              }`}
            >
              {currentQuestionIndex === verificationTasks.length - 1 ? "Verify & Continue" : "Next Question"}
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
