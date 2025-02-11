// routes/share/[quizId]/+page.server.js
import { redirect } from '@sveltejs/kit';

export function load() {
    throw redirect(302, '/quizzes');
}