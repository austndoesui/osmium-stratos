import MainLayout from "../../components/mainlayout";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNotification } from "../../providers/NotificationProvider";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const itemsPerPage = 10;
  const modalRef = useRef(null);
  const buttonRef = useRef(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

  useEffect(() => {
    // Calculate total pages based on filtered users
    const filteredUsers = users.filter((user) => {
      const matchesSearch =
        searchTerm === "" ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    setTotalPages(Math.ceil(filteredUsers.length / itemsPerPage) || 1);

    // Reset to first page if current page is beyond available pages
    if (currentPage > Math.ceil(filteredUsers.length / itemsPerPage)) {
      setCurrentPage(1);
    }
  }, [users, searchTerm, roleFilter, currentPage, itemsPerPage]);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/users")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again later.");
      })
      .finally(() => setLoading(false));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Failed to create user");
        showSuccess("User created successfully!");
        setForm({ username: "", email: "", password: "", role: "user" });
        setShowModal(false);
        fetchUsers();
      })
      .catch((err) => {
        showError(err.message);
        setError(err.message);
      })
      .finally(() => setSubmitting(false));
  };

  const getAvatar = (user) => {
    if (user.avatar) {
      return (
        <img
          src={user.avatar}
          alt={user.username}
          className="h-8 w-8 rounded-full"
        />
      );
    }
    const seed = user.username || "default";
    const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
    return (
      <img
        src={avatarUrl}
        alt={user.username}
        className="h-8 w-8 rounded-full bg-gray-700"
      />
    );
  };

  const handleDelete = (id, username) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user '${username}'? This action cannot be undone.`,
      )
    )
      return;
    fetch(`/api/users/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to delete user");
        }
        setUsers((users) => users.filter((u) => u.id !== id));
      })
      .catch((err) => {
        alert("Error deleting user: " + err.message);
      });
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setCurrentPage(1);
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Calculate the current page's users from filtered results
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(
    indexOfFirstUser,
    indexOfFirstUser + itemsPerPage,
  );

  return (
    <MainLayout>
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <Link to="/" className="text-sm text-gray-400 hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <Link
                    to="/admin"
                    className="text-sm text-gray-400 hover:text-white ml-1 md:ml-2"
                  >
                    Admin
                  </Link>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-300 ml-1 md:ml-2">
                    Users
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              User Management
            </h1>
            <p className="text-base text-gray-400">
              View and manage user accounts
            </p>
          </div>
          <button
            ref={buttonRef}
            className="bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center cursor-pointer"
            onClick={() => setShowModal(!showModal)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add User
          </button>

          {showModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            >
              <div
                ref={modalRef}
                className="bg-gray-800 rounded-lg shadow-xl w-96 border border-gray-700"
                style={{ animation: "fadeInDown 0.2s ease-out forwards" }}
              >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                  <h3 className="text-lg font-medium text-white">
                    Create User
                  </h3>
                  <button
                    className="text-gray-400 hover:text-white cursor-pointer"
                    onClick={() => setShowModal(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="p-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        required
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        placeholder="Enter username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        placeholder="Enter email address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                        placeholder="Enter password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Role
                      </label>
                      <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        required
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {error && (
                      <div className="bg-red-900/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-md">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`bg-white hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {submitting ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <div className="flex flex-wrap items-center justify-between">
              <h2 className="text-lg font-medium text-white">All Users</h2>

              <div className="flex items-center gap-3 mt-0 md:mt-0">
                <div className="w-44 md:w-52 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md pl-10 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div className="relative inline-block">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="appearance-none bg-gray-700 border border-gray-600 rounded-md pl-3 pr-8 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-white cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {(searchTerm || roleFilter !== "all") && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-600 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-white transition-colors cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 text-center text-red-400 border-b border-gray-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700/50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Username
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/30 mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <div className="text-gray-400 font-medium">
                        No users found
                      </div>
                      <p className="text-gray-500 text-sm mt-1">
                        Create a new user to get started
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user, index) => (
                    <tr key={user.id || index} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {getAvatar(user)}
                          <div className="ml-3 text-sm font-medium text-white">
                            {user.username}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-400">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-purple-900/30 text-purple-300"
                              : "bg-blue-900/30 text-blue-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-white hover:text-gray-300 mr-3 transition-colors">
                          Edit
                        </button>
                        <button
                          className="text-red-400 hover:text-red-300 transition-colors"
                          onClick={() => handleDelete(user.id, user.username)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing{" "}
              <span className="font-medium text-white">
                {users.length > 0
                  ? `${indexOfFirstUser + 1}-${Math.min(indexOfLastUser, users.length)}`
                  : "0"}
              </span>{" "}
              of <span className="font-medium text-white">{users.length}</span>{" "}
              users
            </div>
            <div className="flex space-x-1">
              <button
                className={`px-2 py-1 border border-gray-600 rounded-md text-sm ${
                  currentPage === 1
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    className={`px-2 py-1 border ${
                      currentPage === page
                        ? "border-white bg-gray-700 text-white"
                        : "border-gray-600 text-gray-400 hover:bg-gray-700"
                    } rounded-md text-sm`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                className={`px-2 py-1 border border-gray-600 rounded-md text-sm ${
                  currentPage === totalPages
                    ? "text-gray-500 cursor-not-allowed"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </MainLayout>
  );
}
