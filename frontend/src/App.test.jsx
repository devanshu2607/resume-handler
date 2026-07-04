import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from './App';
import axios from 'axios';

vi.mock('axios');

describe('React Frontend App Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login screen by default when session is empty', async () => {
        axios.get.mockResolvedValueOnce({ data: { loggedIn: false, user: null } });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        });

        expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('switches to signup screen when sign up link is clicked', async () => {
        axios.get.mockResolvedValueOnce({ data: { loggedIn: false, user: null } });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        });

        const signUpLink = screen.getByRole('button', { name: /sign up/i });
        fireEvent.click(signUpLink);

        expect(screen.getByText('Create Account')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('renders dashboard with verification warning if logged in but email not validated', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                loggedIn: true,
                user: { id: 1, email: 'unverified@example.com', emailValidated: false }
            }
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Verification Required')).toBeInTheDocument();
            expect(screen.getByText('You need to validate your email to access the portal')).toBeInTheDocument();
        });

        expect(screen.queryByText('Create My Resume')).not.toBeInTheDocument();
    });

    it('renders dashboard with validated message and resume dashboard if email is validated', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                loggedIn: true,
                user: { id: 1, email: 'verified@example.com', emailValidated: true }
            }
        });
        
        axios.get.mockRejectedValueOnce({
            response: { status: 404 }
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Portal Unlocked')).toBeInTheDocument();
            expect(screen.getByText('Your email is validated. You can access the portal')).toBeInTheDocument();
            expect(screen.getByText('No Resume Found')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /create my resume/i })).toBeInTheDocument();
    });

    it('handles verification form submission and unlocks the portal', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                loggedIn: true,
                user: { id: 1, email: 'unverified@example.com', emailValidated: false }
            }
        });

        axios.post.mockResolvedValueOnce({
            data: { success: true, message: 'Email validated' }
        });

        axios.get.mockResolvedValueOnce({
            data: {
                loggedIn: true,
                user: { id: 1, email: 'unverified@example.com', emailValidated: true }
            }
        });

        axios.get.mockRejectedValueOnce({
            response: { status: 404 }
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Verification Required')).toBeInTheDocument();
        });

        const tokenInput = screen.getByPlaceholderText('Enter validation token...');
        fireEvent.change(tokenInput, { target: { value: 'token-123' } });
        
        const verifyBtn = screen.getByRole('button', { name: /validate email/i });
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(screen.getByText('Portal Unlocked')).toBeInTheDocument();
            expect(screen.getByText('Your email is validated. You can access the portal')).toBeInTheDocument();
        });
    });
});
