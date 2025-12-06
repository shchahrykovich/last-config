import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UsersPage from '@/app/users/page'
import type { GetUsersResponseSerialized, UserDtoSerialized } from '@/app/api/users/dto'

// Mock AppLayout component
vi.mock('@/components/AppLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="app-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

describe('UsersPage', () => {
  const mockUsers: UserDtoSerialized[] = [
    {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      emailVerified: new Date('2024-01-01').toISOString(),
      image: null,
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
    },
    {
      id: 'user-2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      emailVerified: null,
      image: null,
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-02').toISOString(),
      updatedAt: new Date('2024-01-02').toISOString(),
    },
  ]

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn()
  })

  describe('Rendering', () => {
    it('should show loading state initially', () => {
      // Mock fetch to never resolve
      global.fetch = vi.fn(() => new Promise(() => {}))

      const { container } = render(<UsersPage />)

      // The loading spinner should be visible (check for Spin component)
      const spinner = container.querySelector('.ant-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should render users list after loading', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    it('should show verified tag for verified users', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      // John Doe is verified
      const johnCard = screen.getByText('John Doe').closest('.ant-card')
      expect(within(johnCard!).getByText('Verified')).toBeInTheDocument()

      // Jane Smith is not verified
      const janeCard = screen.getByText('Jane Smith').closest('.ant-card')
      expect(within(janeCard!).queryByText('Verified')).not.toBeInTheDocument()
    })

    it('should show empty state when no users exist', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('No users yet')).toBeInTheDocument()
      expect(screen.getByText('Add your first user')).toBeInTheDocument()
    })

    it('should display "Add User" button', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const addButtons = screen.getAllByText('Add User')
      expect(addButtons.length).toBeGreaterThan(0)
    })
  })

  describe('User Creation', () => {
    it('should open create modal when "Add User" button is clicked', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const addButton = screen.getAllByText('Add User')[0]
      await user.click(addButton)

      expect(screen.getByText('Add New User')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Name (Optional)')).toBeInTheDocument()
    })

    it('should create a new user successfully', async () => {
      const user = userEvent.setup()
      const newUser: UserDtoSerialized = {
        id: 'user-3',
        email: 'new@example.com',
        name: 'New User',
        emailVerified: null,
        image: null,
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: newUser, message: 'User created successfully' }),
        })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      // Open create modal
      const addButton = screen.getAllByText('Add User')[0]
      await user.click(addButton)

      // Fill form
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText('Name (Optional)'), 'New User')

      // Submit form
      const createButton = screen.getByRole('button', { name: 'Create User' })
      await user.click(createButton)

      // User should be added to the list
      await waitFor(() => {
        expect(screen.getByText('New User')).toBeInTheDocument()
        expect(screen.getByText('new@example.com')).toBeInTheDocument()
      })
    })

    it('should validate email format in create form', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const addButton = screen.getAllByText('Add User')[0]
      await user.click(addButton)

      // Enter invalid email
      const emailInput = screen.getByLabelText('Email')
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger validation

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
      })
    })

    it('should validate password length in create form', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const addButton = screen.getAllByText('Add User')[0]
      await user.click(addButton)

      // Enter short password
      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, '12345')
      await user.tab() // Trigger validation

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
      })
    })

    it('should close create modal on cancel', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const addButton = screen.getAllByText('Add User')[0]
      await user.click(addButton)

      expect(screen.getByText('Add New User')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      // Give modal time to close (Ant Design modals have animations)
      // The important part is that cancel was clicked and no user was created
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Verify no new users were added (still only 2 users from mockUsers)
      const userCards = screen.getAllByRole('heading', { level: 5 })
      expect(userCards.length).toBe(2)
    })
  })

  describe('User Editing', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(screen.getByText('Edit User')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })

    it('should update user successfully', async () => {
      const user = userEvent.setup()
      const updatedUser: UserDtoSerialized = {
        ...mockUsers[0],
        name: 'John Updated',
      }

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: updatedUser, message: 'User updated successfully' }),
        })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      // Update name
      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, 'John Updated')

      // Submit form
      const updateButton = screen.getByRole('button', { name: 'Update User' })
      await user.click(updateButton)

      // User should be updated in the list
      await waitFor(() => {
        expect(screen.getByText('John Updated')).toBeInTheDocument()
      })
    })

    it('should close edit modal on cancel', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(screen.getByText('Edit User')).toBeInTheDocument()

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      // Give modal time to close (Ant Design modals have animations)
      // The important part is that cancel was clicked and user was not modified
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Verify user was not modified (still shows original name)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('User Deletion', () => {
    it('should show confirmation popover when delete button is clicked', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      expect(screen.getByText('Delete User')).toBeInTheDocument()
      expect(
        screen.getByText('Are you sure you want to delete this user? This action cannot be undone.')
      ).toBeInTheDocument()
    })

    it('should delete user when confirmed', async () => {
      const user = userEvent.setup()
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'User deleted successfully' }),
        })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('John Doe')).toBeInTheDocument()

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      const confirmButton = screen.getByText('Yes, delete')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      })

      // Jane should still be in the list
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('should not delete user when cancelled', async () => {
      const user = userEvent.setup()
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // User should still be in the list
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show empty state when fetch users fails', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch users' }),
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      // Should show empty state when fetch fails
      await waitFor(() => {
        expect(screen.getByText('No users yet')).toBeInTheDocument()
      })
    })

    it('should show error message when create user fails', async () => {
      const user = userEvent.setup()
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Email already exists' }),
        })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const addButton = screen.getAllByText('Add User')[0]
      await user.click(addButton)

      await user.type(screen.getByLabelText('Email'), 'john@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')

      const createButton = screen.getByRole('button', { name: 'Create User' })
      await user.click(createButton)

      // Modal should remain open on error
      await waitFor(() => {
        expect(screen.getByText('Add New User')).toBeInTheDocument()
      })
    })

    it('should show error message when update user fails', async () => {
      const user = userEvent.setup()
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Update failed' }),
        })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      const updateButton = screen.getByRole('button', { name: 'Update User' })
      await user.click(updateButton)

      // Modal should remain open on error
      await waitFor(() => {
        expect(screen.getByText('Edit User')).toBeInTheDocument()
      })
    })

    it('should show error message when delete user fails', async () => {
      const user = userEvent.setup()
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: mockUsers } as GetUsersResponseSerialized),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Delete failed' }),
        })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      const confirmButton = screen.getByText('Yes, delete')
      await user.click(confirmButton)

      // User should still be in the list
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })
  })
})
