// POST /api/answer — the logic lives in src/llm/endpoint.ts, where it's typechecked
// and tested. Env: GROQ_API_KEY (required), GROQ_MODEL (optional override).
import { handleAnswerRequest } from '../../src/llm/endpoint'

export default (req: Request) => handleAnswerRequest(req, process.env)

export const config = { path: '/api/answer' }
