import { PersistentState } from "$lib/state.svelte.js";
import { db, auth } from '$lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Initialize persistent state
export const gameState = new PersistentState({
    activeQuizzes: {
        type: 'localStorage',
        value: {} // { quizId: { currentQuestionIndex, score, accuracy, totalAttempts, movies } }
    },
    globalStats: {
        type: 'localStorage',
        value: {
            score: 0,
            accuracy: 0,
            totalAttempts: 0,
            totalQuestionsAnswered: 0
        }
    },
    completedQuizzes: {
        type: 'localStorage',
        value: {} // { quizId: { score, accuracy, totalAttempts, totalQuestionsAnswered } }
    },
    // New: Current quiz state management
    currentQuiz: {
        type: 'localStorage',
        value: {
            quizId: null,
            quiz: null,
            currentQuestionIndex: 0,
            totalQuestions: 0,
            currentMovie: null,
            currentQuestion: null,
            isLastQuestion: false
        }
    }
});

// Initialize state
gameState.$init();

// Helper function to get user ID
function getUserId() {
    return auth.currentUser?.uid;
}

// Background sync functions
export async function syncGlobalStats() {
    const userId = getUserId();
    if (!userId) return;

    try {
        const docRef = doc(db, 'userscores', `${userId}_global`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // Update local state if server has newer data
            const serverData = docSnap.data();
            if (serverData.totalQuestionsAnswered > gameState.globalStats.totalQuestionsAnswered) {
                gameState.globalStats = serverData;
            }
        } else {
            // Initialize server state if it doesn't exist
            await setDoc(docRef, {
                userId,
                type: 'global',
                ...gameState.globalStats
            });
        }
    } catch (error) {
        console.error('Error syncing global stats:', error);
    }
}

export async function initializeQuiz(quizId, quizData) {
    // Initialize quiz state
    gameState.currentQuiz = {
        quizId,
        quiz: quizData,
        currentQuestionIndex: gameState.activeQuizzes[quizId]?.currentQuestionIndex || 0,
        totalQuestions: quizData.questions.length,
        currentMovie: null,
        currentQuestion: null,
        isLastQuestion: false
    };

    // Update current question and movie
    updateCurrentQuestion();

    // Initialize quiz progress if needed
    if (!gameState.activeQuizzes[quizId]) {
        gameState.activeQuizzes[quizId] = {
            currentQuestionIndex: 0,
            score: 0,
            accuracy: 0,
            totalAttempts: 0,
            totalQuestionsAnswered: 0
        };
    }
}

export function updateCurrentQuestion() {
    const { quiz, currentQuestionIndex, totalQuestions } = gameState.currentQuiz;

    if (!quiz || currentQuestionIndex >= totalQuestions) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const currentMovie = quiz.movies[currentQuestion.movie_id];

    gameState.currentQuiz = {
        ...gameState.currentQuiz,
        currentQuestion,
        currentMovie,
        isLastQuestion: currentQuestionIndex === totalQuestions - 1
    };
}

export function advanceQuestion() {
    const { quizId, currentQuestionIndex, totalQuestions } = gameState.currentQuiz;

    if (currentQuestionIndex >= totalQuestions - 1) return;

    // Update both current quiz and active quizzes state
    const newIndex = currentQuestionIndex + 1;

    gameState.currentQuiz = {
        ...gameState.currentQuiz,
        currentQuestionIndex: newIndex
    };

    gameState.activeQuizzes[quizId] = {
        ...gameState.activeQuizzes[quizId],
        currentQuestionIndex: newIndex
    };

    // Update current question and movie
    updateCurrentQuestion();
}

export async function getQuizProgress(quizId) {
    const userId = getUserId();
    if (!userId) return null;

    try {
        const docRef = doc(db, 'userscores', `${userId}_quiz_${quizId}`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error('Error getting quiz progress:', error);
    }
    return null;
}

export async function updateQuizProgress(quizId, update) {
    // Update local state immediately
    gameState.activeQuizzes[quizId] = {
        ...gameState.activeQuizzes[quizId],
        ...update
    };

    // Sync to server in background
    const userId = getUserId();
    if (!userId) return;

    try {
        const docRef = doc(db, 'userscores', `${userId}_quiz_${quizId}`);
        await setDoc(docRef, {
            userId,
            type: 'quiz',
            quizId,
            score: update.score || 0,
            accuracy: update.accuracy || 0,
            totalAttempts: update.totalAttempts || 0,
            totalQuestionsAnswered: update.totalQuestionsAnswered || 0,
            is_completed: false
        }, { merge: true });
    } catch (error) {
        console.error('Error updating quiz progress:', error);
    }
}

export async function completeQuiz(quizId) {
    const userId = getUserId();
    if (!userId) return;

    const quizData = gameState.activeQuizzes[quizId];
    if (!quizData) return;

    try {
        // Mark as completed in local state
        gameState.completedQuizzes[quizId] = quizData;

        // Remove from active quizzes after storing the data
        const finalScore = quizData.score;
        const finalAccuracy = quizData.accuracy;
        const finalAttempts = quizData.totalAttempts;
        const finalQuestionsAnswered = quizData.totalQuestionsAnswered;

        const { [quizId]: _, ...remainingQuizzes } = gameState.activeQuizzes;
        gameState.activeQuizzes = remainingQuizzes;

        // Update server with final state
        const docRef = doc(db, 'userscores', `${userId}_quiz_${quizId}`);
        await setDoc(docRef, {
            userId,
            type: 'quiz',
            quizId,
            score: finalScore,
            accuracy: finalAccuracy,
            totalAttempts: finalAttempts,
            totalQuestionsAnswered: finalQuestionsAnswered,
            is_completed: true
        });
    } catch (error) {
        console.error('Error completing quiz:', error);
    }
}

export async function updateGlobalStats(update) {
    // Update local state immediately
    gameState.globalStats = {
        ...gameState.globalStats,
        ...update
    };

    // Sync to server in background
    const userId = getUserId();
    if (!userId) return;

    try {
        const docRef = doc(db, 'userscores', `${userId}_global`);
        await setDoc(docRef, {
            userId,
            type: 'global',
            score: update.score,
            accuracy: update.accuracy,
            totalAttempts: update.totalAttempts,
            totalQuestionsAnswered: update.totalQuestionsAnswered
        });
    } catch (error) {
        console.error('Error updating global stats:', error);
    }
}

// Utility functions for score calculation
export function calculateQuestionScore(difficulty, wrongAttempts) {
    const baseScore = difficulty * 10;
    const penalty = Math.min(baseScore, wrongAttempts * 5);
    const score = Math.floor(Math.max(0, baseScore - penalty));
    console.log('Score:', score);
    return score;
}