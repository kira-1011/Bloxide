/**
 * Thrown to unwind a program that was stopped or replaced.
 *
 * Its own module because the sprite commands throw it too, and importing the
 * runner for it would be a cycle: the runner is what builds them.
 */
export class ProgramStopped extends Error {}
