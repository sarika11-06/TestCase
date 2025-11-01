import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestCaseGenerator from '../components/TestCaseGenerator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});
describe('TestCaseGenerator', () => {
    const renderComponent = () => {
        return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(TestCaseGenerator, {}) }));
    };
    it('renders form inputs correctly', () => {
        renderComponent();
        expect(screen.getByTestId('input-url')).toBeInTheDocument();
        expect(screen.getByTestId('input-prompt')).toBeInTheDocument();
        expect(screen.getByTestId('button-generate')).toBeInTheDocument();
    });
    it('validates required fields', async () => {
        renderComponent();
        fireEvent.click(screen.getByTestId('button-generate'));
        await waitFor(() => {
            expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
        });
    });
});
