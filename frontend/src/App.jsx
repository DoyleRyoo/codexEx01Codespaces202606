import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const emptyCreateForm = {
  _id: '',
  name: '',
  price: '',
  company: '',
  year: '',
};

const emptyFilterForm = {
  company: '',
  minPrice: '',
  maxPrice: '',
};

const emptyEditForm = {
  name: '',
  price: '',
  company: '',
  year: '',
};

function toCarPayload(form, includeId = false) {
  const payload = {
    name: form.name.trim(),
    price: Number(form.price),
    company: form.company.trim().toUpperCase(),
    year: Number(form.year),
  };

  if (includeId) {
    payload._id = Number(form._id);
  }

  return payload;
}

function validateCarForm(form, includeId = false) {
  const errors = [];
  const currentYear = new Date().getFullYear() + 1;
  const id = Number(form._id);
  const price = Number(form.price);
  const year = Number(form.year);

  if (includeId && (!form._id || !Number.isInteger(id) || id <= 0)) {
    errors.push('ID must be a positive number.');
  }

  if (!form.name.trim()) {
    errors.push('Name is required.');
  }

  if (!form.company.trim()) {
    errors.push('Company is required.');
  }

  if (form.price === '' || !Number.isFinite(price) || price < 0) {
    errors.push('Price must be 0 or greater.');
  }

  if (form.year === '' || !Number.isInteger(year) || year < 1886 || year > currentYear) {
    errors.push(`Year must be between 1886 and ${currentYear}.`);
  }

  return errors;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof data === 'string' ? data : data?.message;
    throw new Error(errorMessage || `Request failed with status ${response.status}`);
  }

  return data;
}

function App() {
  const [cars, setCars] = useState([]);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [filterForm, setFilterForm] = useState(emptyFilterForm);
  const [editCarId, setEditCarId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const stats = useMemo(() => {
    if (cars.length === 0) {
      return { count: 0, averagePrice: 0, latestYear: '-' };
    }

    const totalPrice = cars.reduce((sum, car) => sum + Number(car.price), 0);
    const latestYear = cars.reduce((latest, car) => Math.max(latest, Number(car.year)), 0);

    return {
      count: cars.length,
      averagePrice: Math.round(totalPrice / cars.length),
      latestYear,
    };
  }, [cars]);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
  }, []);

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/cars');
      setCars(data);
      showMessage('success', 'Car list loaded.');
    } catch (error) {
      showMessage('error', `Connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    // Initial backend sync for the dashboard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCars();
  }, [fetchCars]);

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const errors = validateCarForm(createForm, true);

    if (errors.length > 0) {
      showMessage('error', errors.join(' '));
      return;
    }

    setSaving(true);
    try {
      await request('/cars', {
        method: 'POST',
        body: JSON.stringify(toCarPayload(createForm, true)),
      });
      setCreateForm(emptyCreateForm);
      await fetchCars();
      showMessage('success', 'Car added successfully.');
    } catch (error) {
      showMessage('error', `Unable to add car: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleCompanySearch(event) {
    event.preventDefault();
    const company = filterForm.company.trim();

    setLoading(true);
    try {
      const path = company ? `/cars/search?company=${encodeURIComponent(company.toUpperCase())}` : '/cars/search';
      const data = await request(path);
      setCars(data);
      showMessage('success', company ? `Showing cars from ${company.toUpperCase()}.` : 'Showing all cars.');
    } catch (error) {
      showMessage('error', `Search failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handlePriceFilter(event) {
    event.preventDefault();
    const { minPrice, maxPrice } = filterForm;
    const parsedMinPrice = Number(minPrice);
    const parsedMaxPrice = Number(maxPrice);

    if (minPrice !== '' && (!Number.isFinite(parsedMinPrice) || parsedMinPrice < 0)) {
      showMessage('error', 'Min price must be 0 or greater.');
      return;
    }

    if (maxPrice !== '' && (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice < 0)) {
      showMessage('error', 'Max price must be 0 or greater.');
      return;
    }

    if (minPrice !== '' && maxPrice !== '' && parsedMinPrice > parsedMaxPrice) {
      showMessage('error', 'Min price cannot be greater than max price.');
      return;
    }

    const params = new URLSearchParams();
    if (minPrice !== '') params.set('minPrice', minPrice);
    if (maxPrice !== '') params.set('maxPrice', maxPrice);

    setLoading(true);
    try {
      const data = await request(`/cars/filter${params.toString() ? `?${params}` : ''}`);
      setCars(data);
      showMessage('success', 'Price filter applied.');
    } catch (error) {
      showMessage('error', `Price filter failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setFilterForm(emptyFilterForm);
    await fetchCars();
    showMessage('success', 'Filters reset.');
  }

  async function handleEditClick(id) {
    setLoading(true);
    try {
      const car = await request(`/cars/${id}`);
      setEditCarId(car._id);
      setEditForm({
        name: car.name,
        price: String(car.price),
        company: car.company,
        year: String(car.year),
      });
      showMessage('success', `Loaded ${car.name} for editing.`);
    } catch (error) {
      showMessage('error', `Unable to load car detail: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    const errors = validateCarForm(editForm);

    if (errors.length > 0) {
      showMessage('error', errors.join(' '));
      return;
    }

    setSaving(true);
    try {
      await request(`/cars/${editCarId}`, {
        method: 'PUT',
        body: JSON.stringify(toCarPayload(editForm)),
      });
      setEditCarId(null);
      setEditForm(emptyEditForm);
      await fetchCars();
      showMessage('success', 'Car updated successfully.');
    } catch (error) {
      showMessage('error', `Unable to update car: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(`Delete car #${id}?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      await request(`/cars/${id}`, { method: 'DELETE' });
      await fetchCars();
      showMessage('success', 'Car deleted successfully.');
    } catch (error) {
      showMessage('error', `Unable to delete car: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Fleet Operations</p>
          <h1>Car Management Dashboard</h1>
          <p className="hero-copy">Create, search, filter, update, and remove cars from a single operational view.</p>
        </div>
        <div className="stats-grid" aria-label="Car list summary">
          <div className="stat">
            <span>{stats.count}</span>
            <small>Cars</small>
          </div>
          <div className="stat">
            <span>{stats.averagePrice.toLocaleString()}</span>
            <small>Avg price</small>
          </div>
          <div className="stat">
            <span>{stats.latestYear}</span>
            <small>Latest year</small>
          </div>
        </div>
      </section>

      {message && (
        <div className={`message ${message.type}`} role="status">
          {message.text}
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message">
            x
          </button>
        </div>
      )}

      <section className="dashboard-grid">
        <CreateCarForm
          form={createForm}
          onChange={setCreateForm}
          onSubmit={handleCreateSubmit}
          disabled={saving}
        />
        <FilterPanel
          form={filterForm}
          onChange={setFilterForm}
          onCompanySearch={handleCompanySearch}
          onPriceFilter={handlePriceFilter}
          onReset={handleReset}
          disabled={loading}
        />
      </section>

      <CarTable
        cars={cars}
        loading={loading}
        saving={saving}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />

      {editCarId !== null && (
        <EditModal
          carId={editCarId}
          form={editForm}
          onChange={setEditForm}
          onClose={() => {
            setEditCarId(null);
            setEditForm(emptyEditForm);
          }}
          onSubmit={handleEditSubmit}
          disabled={saving}
        />
      )}
    </main>
  );
}

function Field({ label, name, value, onChange, type = 'text', min, max, placeholder, required = true }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange((current) => ({ ...current, [name]: event.target.value }))}
      />
    </label>
  );
}

function CreateCarForm({ form, onChange, onSubmit, disabled }) {
  return (
    <form className="panel" onSubmit={onSubmit}>
      <div className="panel-heading">
        <p className="eyebrow">Create</p>
        <h2>Add Car</h2>
      </div>
      <div className="form-grid">
        <Field label="ID" name="_id" type="number" min="1" value={form._id} onChange={onChange} placeholder="4" />
        <Field label="Name" name="name" value={form.name} onChange={onChange} placeholder="Avante" />
        <Field label="Price" name="price" type="number" min="0" value={form.price} onChange={onChange} placeholder="2200" />
        <Field label="Company" name="company" value={form.company} onChange={onChange} placeholder="HYUNDAI" />
        <Field label="Year" name="year" type="number" min="1886" value={form.year} onChange={onChange} placeholder="2025" />
      </div>
        <button className="primary-button" type="submit" disabled={disabled}>
        {disabled ? 'Saving...' : 'Add Car'}
      </button>
    </form>
  );
}

function FilterPanel({ form, onChange, onCompanySearch, onPriceFilter, onReset, disabled }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Search & Filter</p>
        <h2>Find Cars</h2>
      </div>

      <form className="stacked-form" onSubmit={onCompanySearch}>
        <Field
          label="Company"
          name="company"
          value={form.company}
          onChange={onChange}
          placeholder="KIA"
          required={false}
        />
        <button className="secondary-button" type="submit" disabled={disabled}>
          Search Company
        </button>
      </form>

      <form className="stacked-form" onSubmit={onPriceFilter}>
        <div className="range-row">
          <Field label="Min Price" name="minPrice" type="number" min="0" value={form.minPrice} onChange={onChange} required={false} />
          <Field label="Max Price" name="maxPrice" type="number" min="0" value={form.maxPrice} onChange={onChange} required={false} />
        </div>
        <div className="button-row">
          <button className="secondary-button" type="submit" disabled={disabled}>
            Apply Price
          </button>
          <button className="ghost-button" type="button" onClick={onReset} disabled={disabled}>
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}

function CarTable({ cars, loading, saving, onEdit, onDelete }) {
  const actionsDisabled = loading || saving;

  return (
    <section className="table-section">
      <div className="table-heading">
        <div>
          <p className="eyebrow">Inventory</p>
          <h2>Car List</h2>
        </div>
        {loading && <span className="loading-pill">Loading...</span>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Company</th>
              <th>Year</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cars.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan="6">
                  No cars found.
                </td>
              </tr>
            ) : (
              cars.map((car) => (
                <tr key={car._id}>
                  <td>#{car._id}</td>
                  <td className="strong-cell">{car.name}</td>
                  <td>{Number(car.price).toLocaleString()}</td>
                  <td>
                    <span className="company-badge">{car.company}</span>
                  </td>
                  <td>{car.year}</td>
                  <td>
                    <div className="action-row">
                      <button className="small-button" type="button" onClick={() => onEdit(car._id)} disabled={actionsDisabled}>
                        Edit
                      </button>
                      <button className="danger-button" type="button" onClick={() => onDelete(car._id)} disabled={actionsDisabled}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditModal({ carId, form, onChange, onClose, onSubmit, disabled }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Edit #{carId}</p>
            <h2 id="edit-title">Update Car</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close edit dialog">
            x
          </button>
        </div>

        <div className="form-grid">
          <Field label="Name" name="name" value={form.name} onChange={onChange} />
          <Field label="Price" name="price" type="number" min="0" value={form.price} onChange={onChange} />
          <Field label="Company" name="company" value={form.company} onChange={onChange} />
          <Field label="Year" name="year" type="number" min="1886" value={form.year} onChange={onChange} />
        </div>

        <div className="modal-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={disabled}>
            {disabled ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;
