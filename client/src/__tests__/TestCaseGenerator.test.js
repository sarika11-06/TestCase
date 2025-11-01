import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach } from 'vitest';
import TestCaseGenerator from '../components/TestCaseGenerator';
describe('TestCaseGenerator', () => {
    const queryClient = new QueryClient();
    beforeEach(() => {
        render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(TestCaseGenerator, {}) }));
    });
    it('should render the form inputs', () => {
        expect(screen.getByTestId('input-url')).toBeInTheDocument();
        expect(screen.getByTestId('input-prompt')).toBeInTheDocument();
        expect(screen.getByTestId('button-generate')).toBeInTheDocument();
    });
    it('should validate form inputs', async () => {
        fireEvent.click(screen.getByTestId('button-generate'));
        await waitFor(() => {
            expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
        });
    });
    it('should generate test cases successfully', async () => {
        fireEvent.change(screen.getByTestId('input-url'), {
            target: { value: 'https://example.com' }
        });
        fireEvent.change(screen.getByTestId('input-prompt'), {
            target: { value: 'Test the login functionality' }
        });
        fireEvent.click(screen.getByTestId('button-generate'));
        await waitFor(() => {
            expect(screen.getByText(/test cases generated successfully/i)).toBeInTheDocument();
        });
    });
});
