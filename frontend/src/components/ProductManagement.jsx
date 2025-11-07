import { useState, useEffect } from "react";
import {
  Button,
  Input,
  InputNumber,
  Table,
  Tag,
  Space,
  Form,
  Select,
  Card,
  Popconfirm,
  message,
} from "antd";
import {
  PlusOutlined,
  FilePdfOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { canEdit, canDelete, canCreate } from "../service/auth";
import { capitalizeTableText } from "../utils/textUtils";

const ProductManagement = () => {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  const [brandFilter, setBrandFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [availabilityFilter, setAvailabilityFilter] = useState(null);
  const [hasGST, setHasGST] = useState(false);
  
  // Inline add form states
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  
  // Inline form values
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandStatus, setNewBrandStatus] = useState("active");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryStatus, setNewCategoryStatus] = useState(true);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitStatus, setNewUnitStatus] = useState(true);

  // Fetch brands, categories, units for dropdowns
  const fetchDropdowns = async () => {
    try {
      const [brandsRes, categoriesRes, unitsRes] = await Promise.all([
        api.get("/api/brands?page=1&limit=1000").catch(err => {
          console.error("Error fetching brands", err);
          return { data: { success: true, data: [] } };
        }),
        api.get("/api/categories?page=1&limit=1000").catch(err => {
          console.error("Error fetching categories", err);
          return { data: { success: true, data: [] } };
        }),
        api.get("/api/units?page=1&limit=1000").catch(err => {
          console.error("Error fetching units", err);
          return { data: { success: true, data: [] } };
        }),
      ]);
      
      // Handle different response formats
      const getData = (res) => {
        if (res.data?.success && res.data?.data) {
          return Array.isArray(res.data.data) ? res.data.data : [];
        }
        return [];
      };
      
      setBrands(getData(brandsRes));
      setCategories(getData(categoriesRes));
      setUnits(getData(unitsRes));
    } catch (err) {
      console.error("Error fetching dropdowns", err);
      message.error("Failed to fetch dropdown options");
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  // Fetch products
  const fetchProducts = async (page = null, limit = null) => {
    setLoading(true);
    try {
      // Use current pagination if not specified, with fallback to defaults
      const currentPage = page ?? pagination.current ?? 1;
      const currentLimit = limit ?? pagination.pageSize ?? 10;
      
      const res = await api.get(`/api/products?page=${currentPage}&limit=${currentLimit}`);
      
      if (res.data && res.data.success) {
        const productsData = res.data.data || [];
        
        
        setProducts(productsData);
        
        // Update pagination state
        setPagination(prev => ({
          ...prev,
          current: res.data.page || currentPage,
          total: res.data.total || 0,
          pageSize: res.data.limit || currentLimit,
        }));
      } else {
        message.error("Failed to fetch products: Invalid response format");
        setProducts([]);
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.message 
        || err?.response?.data?.error 
        || err?.message 
        || "Failed to fetch products";
      message.error(errorMessage);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    fetchProducts(pagination.current, pagination.pageSize);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle form submit (create or update)
  const handleSubmit = async (values) => {
    try {
      const currentUser = localStorage.getItem("username") || "Unknown";
      const gstType = values.gstType || "no";
      const hasGSTValue = gstType === "with";
      
      // Helper function to convert empty strings, undefined, or null to null
      const toNullIfEmpty = (value) => {
        if (value === undefined || value === null || value === "") {
          return null;
        }
        // Ensure UUIDs are strings
        return String(value);
      };
      
      // Extract brandId, categoryId, unitId with proper handling
      // Get values directly from form to ensure we capture Select component values
      const formValues = form.getFieldsValue();
      const brandId = toNullIfEmpty(formValues.brandId || values.brandId);
      const categoryId = toNullIfEmpty(formValues.categoryId || values.categoryId);
      const unitId = toNullIfEmpty(formValues.unitId || values.unitId);
      
      const payload = {
        productName: values.productName?.trim(),
        hsn_sac_code: values.hsn_sac_code?.trim() || null,
        hasGST: hasGSTValue,
        gstPercent: hasGSTValue ? (values.gstPercent || null) : null,
        discountPercent: values.discountPercent || null,
        piecePrice: values.piecePrice || null,
        pieceSalesPrice: values.pieceSalesPrice || null,
        purchasePrice: values.purchasePrice || null,
        salesPrice: values.salesPrice || null,
        description: values.description?.trim() || null,
        availability: values.availability || "Yes",
        lowQtyIndication: values.lowQtyIndication || null,
        unitQuantity: values.unitQuantity || null,
        initialStock: values.initialStock || 0,
        // Explicitly include brandId, categoryId, unitId (can be null)
        brandId: brandId,
        categoryId: categoryId,
        unitId: unitId,
        // barCode is auto-generated by backend hook, don't send it
      };
      
      // Verify payload includes the IDs (for debugging - can be removed later)
      if (!payload.hasOwnProperty('brandId') || !payload.hasOwnProperty('categoryId') || !payload.hasOwnProperty('unitId')) {
        // This should never happen, but ensures the fields are always included
      }
      
      if (editingId) {
        payload.updatedBy = currentUser;
        const updateRes = await api.put(`/api/products/${editingId}`, payload);
        
        if (updateRes.data && updateRes.data.success) {
          message.success("Product updated successfully");
          setShowForm(false);
          setEditingId(null);
          setEditingRecord(null);
          setHasGST(false);
          form.resetFields();
          // Refresh products with current pagination to show updated associations
          await fetchProducts(pagination.current, pagination.pageSize);
        } else {
          message.error(updateRes.data?.message || "Failed to update product");
        }
      } else {
        payload.createdBy = currentUser;
        const res = await api.post("/api/products", payload);
        
        if (res.data && res.data.success) {
          message.success("Product created successfully");
          setShowForm(false);
          setEditingId(null);
          setEditingRecord(null);
          setHasGST(false);
          form.resetFields();
          // Refresh products - go to first page to show new product with associations
          await fetchProducts(1, pagination.pageSize);
        } else {
          message.error(res.data?.message || "Failed to create product");
        }
      }
    } catch (err) {
      
      const errorData = err?.response?.data;
      
      // Handle validation errors array (from Zod/Sequelize validation)
      if (errorData?.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const errorMessages = errorData.errors.map(e => {
          const field = e.field || e.path || "unknown";
          const msg = e.message || "Validation error";
          return `${field}: ${msg}`;
        }).join(", ");
        message.error(errorMessages || "Validation failed");
      } 
      // Handle single error message
      else if (errorData?.message) {
        message.error(errorData.message);
      } 
      // Handle error string
      else if (errorData?.error) {
        message.error(errorData.error);
      } 
      // Handle Axios error message
      else if (err?.message) {
        message.error(err.message);
      }
      // Fallback
      else {
        const fallbackMessage = `Error saving product${err?.response?.status ? ` (Status: ${err.response.status})` : ''}`;
        message.error(fallbackMessage);
      }
    }
  };

  // Handle edit
  const handleEdit = async (record) => {
    setEditingId(record.id);
    setEditingRecord(record);
    setShowForm(true);
    const hasGSTValue = record.hasGST === true || record.hasGST === "true";
    setHasGST(hasGSTValue);
    
    // Ensure dropdowns are loaded before showing form
    if (brands.length === 0 || categories.length === 0 || units.length === 0) {
      await fetchDropdowns();
    }
  };

  // Compute initial values for the form when editing
  const getInitialValues = () => {
    if (!editingRecord) return undefined;
    
    const hasGSTValue = editingRecord.hasGST === true || editingRecord.hasGST === "true";
    
    // Extract IDs - handle both direct IDs and nested object IDs
    const brandId = editingRecord.brandId || editingRecord.brand?.id || null;
    const categoryId = editingRecord.categoryId || editingRecord.category?.id || null;
    const unitId = editingRecord.unitId || editingRecord.unit?.id || null;
    
    return {
      productName: editingRecord.productName,
      barCode: editingRecord.barCode,
      hsn_sac_code: editingRecord.hsn_sac_code,
      gstType: hasGSTValue ? "with" : "no",
      gstPercent: editingRecord.gstPercent,
      discountPercent: editingRecord.discountPercent,
      piecePrice: editingRecord.piecePrice,
      pieceSalesPrice: editingRecord.pieceSalesPrice,
      purchasePrice: editingRecord.purchasePrice || editingRecord.purchasePriceWithGST || editingRecord.purchasePriceWithoutGST,
      salesPrice: editingRecord.salesPrice || editingRecord.salesPriceWithGST || editingRecord.salesPriceWithoutGST,
      description: editingRecord.description,
      availability: editingRecord.availability,
      lowQtyIndication: editingRecord.lowQtyIndication,
      unitQuantity: editingRecord.unitQuantity,
      initialStock: editingRecord.initialStock || 0,
      brandId: brandId,
      categoryId: categoryId,
      unitId: unitId,
    };
  };

  // useEffect to set form values when editing and form is shown
  useEffect(() => {
    if (editingRecord && showForm && brands.length > 0 && categories.length > 0 && units.length > 0) {
      const hasGSTValue = editingRecord.hasGST === true || editingRecord.hasGST === "true";
      
      // Extract IDs - handle both direct IDs and nested object IDs
      // Convert to string to ensure type matching with Select.Option values
      const brandId = editingRecord.brandId || editingRecord.brand?.id || null;
      const categoryId = editingRecord.categoryId || editingRecord.category?.id || null;
      const unitId = editingRecord.unitId || editingRecord.unit?.id || null;
      
      // Verify IDs exist in dropdowns (important for Select components)
      const brandExists = brandId ? brands.some(b => String(b.id) === String(brandId)) : false;
      const categoryExists = categoryId ? categories.some(c => String(c.id) === String(categoryId)) : false;
      const unitExists = unitId ? units.some(u => String(u.id) === String(unitId)) : false;
      
      // Prepare form values
      const formValues = {
        productName: editingRecord.productName,
        barCode: editingRecord.barCode,
        hsn_sac_code: editingRecord.hsn_sac_code,
        gstType: hasGSTValue ? "with" : "no",
        gstPercent: editingRecord.gstPercent,
        discountPercent: editingRecord.discountPercent,
        piecePrice: editingRecord.piecePrice,
        pieceSalesPrice: editingRecord.pieceSalesPrice,
        purchasePrice: editingRecord.purchasePrice || editingRecord.purchasePriceWithGST || editingRecord.purchasePriceWithoutGST,
        salesPrice: editingRecord.salesPrice || editingRecord.salesPriceWithGST || editingRecord.salesPriceWithoutGST,
        description: editingRecord.description,
        availability: editingRecord.availability,
        lowQtyIndication: editingRecord.lowQtyIndication,
        unitQuantity: editingRecord.unitQuantity,
        initialStock: editingRecord.initialStock || 0,
        // Only set IDs if they exist in dropdowns
        brandId: brandExists ? brandId : null,
        categoryId: categoryExists ? categoryId : null,
        unitId: unitExists ? unitId : null,
      };
      
      // Set values directly without resetting first to avoid clearing user input
      // Use requestAnimationFrame and setTimeout to ensure Select components are ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          form.setFieldsValue(formValues);
        }, 100);
      });
    } else if (!editingRecord && showForm) {
      // Reset form when creating new product (only when form is first shown)
      // Don't reset if user is already filling the form
      if (!form.getFieldValue('productName')) {
        form.resetFields();
      }
    }
  }, [editingRecord, showForm, brands, categories, units, form]);

  // Handle inline add - Brand
  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      message.error("Brand name is required");
      return;
    }
    setAddingBrand(true);
    try {
      const res = await api.post("/api/brands", {
        brandName: newBrandName.trim(),
        brandStatus: newBrandStatus,
      });
      if (res.data && res.data.success) {
        const newBrand = res.data.data;
        message.success("Brand added successfully");
        
        // Immediately add the new brand to the state (optimistic update)
        setBrands(prevBrands => {
          // Check if brand already exists to avoid duplicates
          const exists = prevBrands.some(b => b.id === newBrand.id);
          if (exists) {
            return prevBrands;
          }
          return [...prevBrands, newBrand];
        });
        
        // Also refresh from server to ensure we have latest data
        await fetchDropdowns();
        
        // Auto-select the newly created brand
        form.setFieldValue("brandId", newBrand.id);
        
        // Reset form
        setNewBrandName("");
        setNewBrandStatus("active");
        setShowAddBrand(false);
      } else {
        message.error(res.data?.message || "Failed to add brand");
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Error adding brand";
      message.error(errorMsg);
    } finally {
      setAddingBrand(false);
    }
  };

  // Handle inline add - Category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      message.error("Category name is required");
      return;
    }
    setAddingCategory(true);
    try {
      const res = await api.post("/api/categories", {
        categoryName: newCategoryName.trim(),
        categoryStatus: newCategoryStatus,
      });
      if (res.data && res.data.success) {
        const newCategory = res.data.data;
        message.success("Category added successfully");
        
        // Immediately add the new category to the state (optimistic update)
        setCategories(prevCategories => {
          // Check if category already exists to avoid duplicates
          const exists = prevCategories.some(c => c.id === newCategory.id);
          if (exists) {
            return prevCategories;
          }
          return [...prevCategories, newCategory];
        });
        
        // Also refresh from server to ensure we have latest data
        await fetchDropdowns();
        
        // Auto-select the newly created category
        form.setFieldValue("categoryId", newCategory.id);
        
        // Reset form
        setNewCategoryName("");
        setNewCategoryStatus(true);
        setShowAddCategory(false);
      } else {
        message.error(res.data?.message || "Failed to add category");
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Error adding category";
      message.error(errorMsg);
    } finally {
      setAddingCategory(false);
    }
  };

  // Handle inline add - Unit
  const handleAddUnit = async () => {
    if (!newUnitName.trim()) {
      message.error("Unit name is required");
      return;
    }
    setAddingUnit(true);
    try {
      const res = await api.post("/api/units", {
        unitName: newUnitName.trim(),
        unitStatus: newUnitStatus,
      });
      if (res.data && res.data.success) {
        const newUnit = res.data.data;
        message.success("Unit added successfully");
        
        // Immediately add the new unit to the state (optimistic update)
        setUnits(prevUnits => {
          // Check if unit already exists to avoid duplicates
          const exists = prevUnits.some(u => u.id === newUnit.id);
          if (exists) {
            return prevUnits;
          }
          return [...prevUnits, newUnit];
        });
        
        // Also refresh from server to ensure we have latest data
        await fetchDropdowns();
        
        // Auto-select the newly created unit
        form.setFieldValue("unitId", newUnit.id);
        
        // Reset form
        setNewUnitName("");
        setNewUnitStatus(true);
        setShowAddUnit(false);
      } else {
        message.error(res.data?.message || "Failed to add unit");
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Error adding unit";
      message.error(errorMsg);
    } finally {
      setAddingUnit(false);
    }
  };

  // Handle hard delete
  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/api/products/${id}/hard`);
      
      if (res.data && res.data.success) {
        message.success("Product deleted successfully");
        // Refresh the product list with current pagination
        await fetchProducts(pagination.current, pagination.pageSize);
      } else {
        const errorMessage = res.data?.message || res.data?.error || "Failed to delete product";
        console.error(`❌ [Product Frontend] Delete failed:`, errorMessage);
        
        // Check if it's a dependency error
        if (res.data?.dependencies) {
          const deps = res.data.dependencies;
          message.error(`${errorMessage} (Stock: ${deps.stock}, Bill Items: ${deps.billItems}, PO Items: ${deps.poItems || 0})`);
        } else {
          message.error(errorMessage);
        }
      }
    } catch (err) {
      console.error(`❌ [Product Frontend] Error deleting product:`, err);
      console.error(`❌ [Product Frontend] Error response:`, err?.response);
      console.error(`❌ [Product Frontend] Error response data:`, err?.response?.data);
      console.error(`❌ [Product Frontend] Error response status:`, err?.response?.status);
      
      const errorData = err?.response?.data;
      let errorMessage = "Error deleting product";
      
      if (errorData) {
        // Check for dependency information
        if (errorData.dependencies) {
          const deps = errorData.dependencies;
          errorMessage = `${errorData.message || errorMessage} (Stock: ${deps.stock}, Bill Items: ${deps.billItems}, PO Items: ${deps.poItems || 0})`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          errorMessage = errorData.errors.map(e => e.message || e).join(", ");
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      message.error(errorMessage);
    }
  };

  // PDF Export
  const exportToPDF = async () => {
    const res = await api.get("/api/products?page=1&limit=1000");
    const allProducts = res.data.data || [];

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Product List</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Product List</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Availability</th>
                <th>GST %</th>
                <th>Unit Purchase Price</th>
                <th>Unit Sales Price</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              ${allProducts
                .filter((p) =>
                  p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.barCode?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(
                  (product) => `
                <tr>
                  <td>${product.barCode || "-"}</td>
                  <td>${product.productName || "-"}</td>
                  <td>${product.brand?.brandName || "-"}</td>
                  <td>${product.category?.categoryName || "-"}</td>
                  <td>${product.unit?.unitName || "-"}</td>
                  <td>${product.availability || "-"}</td>
                  <td>${product.hasGST && product.gstPercent ? `${product.gstPercent}%` : "-"}</td>
                  <td>₹${(product.purchasePrice || 0).toFixed(2)}</td>
                  <td>₹${(product.salesPrice || 0).toFixed(2)}</td>
                  <td>₹${((product.salesPrice || 0) - (product.purchasePrice || 0)).toFixed(2)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Table columns
  const columns = [
    { title: "Barcode", dataIndex: "barCode", key: "barCode" },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      render: (title) => (
        <div style={{ minWidth: 180, wordWrap: "break-word" }}>
          {capitalizeTableText(title, "productName")}
        </div>
      ),
    },
    {
      title: "Brand",
      dataIndex: ["brand", "brandName"],
      key: "brand",
      render: (brandName, record) => {
        // Try multiple ways to access brand name
        const brand = record?.brand?.brandName || brandName || record?.brandName || null;
        return brand ? capitalizeTableText(brand, "brandName") : "-";
      },
    },
    {
      title: "Category",
      dataIndex: ["category", "categoryName"],
      key: "category",
      render: (categoryName, record) => {
        // Try multiple ways to access category name
        const category = record?.category?.categoryName || categoryName || record?.categoryName || null;
        return category ? capitalizeTableText(category, "categoryName") : "-";
      },
    },
    {
      title: "Unit",
      dataIndex: ["unit", "unitName"],
      key: "unit",
      render: (unitName, record) => {
        // Try multiple ways to access unit name
        const unit = record?.unit?.unitName || unitName || record?.unitName || null;
        return unit ? capitalizeTableText(unit, "unitName") : "-";
      },
    },
    {
      title: "Availability",
      dataIndex: "availability",
      key: "availability",
      render: (availability) => {
        const colors = { Yes: "green", No: "red" };
        return (
          <Tag color={colors[availability] || "default"}>
            {availability || "-"}
          </Tag>
        );
      },
    },
    {
      title: "GST %",
      key: "gst",
      render: (_, record) => {
        if (record.hasGST && record.gstPercent) {
          return `${record.gstPercent}%`;
        }
        return "-";
      },
    },
    {
      title: "Unit Purchase Price",
      dataIndex: "purchasePrice",
      key: "purchasePrice",
      render: (price) => price ? `₹${price.toFixed(2)}` : "-",
    },
    {
      title: "Unit Sales Price",
      dataIndex: "salesPrice",
      key: "salesPrice",
      render: (price) => price ? `₹${price.toFixed(2)}` : "-",
    },
    {
      title: "Profit",
      key: "profit",
      render: (_, record) => {
        const purchasePrice = record.purchasePrice || 0;
        const salesPrice = record.salesPrice || 0;
        const profit = salesPrice - purchasePrice;
        const color = profit >= 0 ? "#52c41a" : "#ff4d4f";
        return (
          <span style={{ color, fontWeight: "bold" }}>
            ₹{profit.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: "Created By",
      dataIndex: "createdBy",
      key: "createdBy",
      render: (createdBy) => createdBy || "-",
    },
    {
      title: "Updated By",
      dataIndex: "updatedBy",
      key: "updatedBy",
      render: (updatedBy) => updatedBy || "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {canEdit() && (
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          )}
          {canDelete() && (
            <Popconfirm
              title="Are you sure to delete this record permanently?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <Space>
          <Button
            icon={<FilePdfOutlined />}
            onClick={exportToPDF}
            type="primary"
            danger
          >
            Export PDF
          </Button>
          {canCreate() && (
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setEditingRecord(null);
                setHasGST(false);
                form.resetFields();
              }}
              type="primary"
            >
              {showForm ? "Cancel" : "Add Product"}
            </Button>
          )}
        </Space>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <Form 
            layout="vertical" 
            form={form} 
            onFinish={handleSubmit}
            initialValues={getInitialValues()}
            key={editingId || 'new'}
          >
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="productName"
                label="Product Name"
                rules={[
                  { required: true, message: "Product name is required" },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="barCode"
                label="Barcode"
              >
                <Input disabled placeholder="Auto-generated" />
              </Form.Item>
              <Form.Item
                name="hsn_sac_code"
                label="HSN/SAC Code (for GST)"
              >
                <Input maxLength={20} placeholder="Enter HSN or SAC code" />
              </Form.Item>
              <Form.Item
                name="gstType"
                label="GST"
                initialValue="no"
              >
                <Select onChange={(value) => setHasGST(value === "with")}>
                  <Select.Option value="no">No GST</Select.Option>
                  <Select.Option value="with">With GST</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="brandId"
                label="Brand"
                getValueFromEvent={(value) => value}
                normalize={(value) => value || null}
              >
                <Select 
                  placeholder="Select Brand" 
                  allowClear
                  onChange={(value) => {
                    form.setFieldValue("brandId", value || null);
                  }}
                >
                  {brands.map((brand) => (
                    <Select.Option key={brand.id} value={brand.id}>
                      {brand.brandName}
                    </Select.Option>
                  ))}
                </Select>
                <div style={{ marginTop: "8px" }}>
                  {!showAddBrand ? (
                    <Button
                      size="small"
                      onClick={() => setShowAddBrand(true)}
                      style={{ 
                        backgroundColor: "#722ed1",
                        borderColor: "#722ed1",
                        color: "#ffffff",
                        padding: "4px 8px",
                        height: "auto",
                        fontSize: "14px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#531dab";
                        e.currentTarget.style.borderColor = "#531dab";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#722ed1";
                        e.currentTarget.style.borderColor = "#722ed1";
                      }}
                    >
                      + Add Brand
                    </Button>
                  ) : (
                    <div style={{ 
                      padding: "12px", 
                      border: "1px solid #d9d9d9", 
                      borderRadius: "4px",
                      backgroundColor: "#fafafa",
                      marginTop: "8px"
                    }}>
                      <Space direction="vertical" style={{ width: "100%" }} size="small">
                        <Input
                          placeholder="Enter brand name"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          onPressEnter={handleAddBrand}
                        />
                        <Select
                          value={newBrandStatus}
                          onChange={setNewBrandStatus}
                          style={{ width: "100%" }}
                        >
                          <Select.Option value="active">Active</Select.Option>
                          <Select.Option value="inactive">Inactive</Select.Option>
                        </Select>
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            onClick={handleAddBrand}
                            loading={addingBrand}
                          >
                            Add
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setShowAddBrand(false);
                              setNewBrandName("");
                              setNewBrandStatus("active");
                            }}
                          >
                            Cancel
                          </Button>
                        </Space>
                      </Space>
                    </div>
                  )}
                </div>
              </Form.Item>
              <Form.Item
                name="categoryId"
                label="Category"
                getValueFromEvent={(value) => value}
                normalize={(value) => value || null}
              >
                <Select 
                  placeholder="Select Category" 
                  allowClear
                  onChange={(value) => {
                    form.setFieldValue("categoryId", value || null);
                  }}
                >
                  {categories.map((category) => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.categoryName}
                    </Select.Option>
                  ))}
                </Select>
                <div style={{ marginTop: "8px" }}>
                  {!showAddCategory ? (
                    <Button
                      size="small"
                      onClick={() => setShowAddCategory(true)}
                      style={{ 
                        backgroundColor: "#722ed1",
                        borderColor: "#722ed1",
                        color: "#ffffff",
                        padding: "4px 8px",
                        height: "auto",
                        fontSize: "14px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#531dab";
                        e.currentTarget.style.borderColor = "#531dab";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#722ed1";
                        e.currentTarget.style.borderColor = "#722ed1";
                      }}
                    >
                      + Add Category
                    </Button>
                  ) : (
                    <div style={{ 
                      padding: "12px", 
                      border: "1px solid #d9d9d9", 
                      borderRadius: "4px",
                      backgroundColor: "#fafafa",
                      marginTop: "8px"
                    }}>
                      <Space direction="vertical" style={{ width: "100%" }} size="small">
                        <Input
                          placeholder="Enter category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onPressEnter={handleAddCategory}
                        />
                        <Select
                          value={newCategoryStatus}
                          onChange={setNewCategoryStatus}
                          style={{ width: "100%" }}
                        >
                          <Select.Option value={true}>Active</Select.Option>
                          <Select.Option value={false}>Inactive</Select.Option>
                        </Select>
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            onClick={handleAddCategory}
                            loading={addingCategory}
                          >
                            Add
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setShowAddCategory(false);
                              setNewCategoryName("");
                              setNewCategoryStatus(true);
                            }}
                          >
                            Cancel
                          </Button>
                        </Space>
                      </Space>
                    </div>
                  )}
                </div>
              </Form.Item>
              <Form.Item
                name="unitId"
                label="Unit"
                getValueFromEvent={(value) => value}
                normalize={(value) => value || null}
              >
                <Select 
                  placeholder="Select Unit" 
                  allowClear
                  onChange={(value) => {
                    form.setFieldValue("unitId", value || null);
                  }}
                >
                  {units.map((unit) => (
                    <Select.Option key={unit.id} value={unit.id}>
                      {unit.unitName}
                    </Select.Option>
                  ))}
                </Select>
                <div style={{ marginTop: "8px" }}>
                  {!showAddUnit ? (
                    <Button
                      size="small"
                      onClick={() => setShowAddUnit(true)}
                      style={{ 
                        backgroundColor: "#722ed1",
                        borderColor: "#722ed1",
                        color: "#ffffff",
                        padding: "4px 8px",
                        height: "auto",
                        fontSize: "14px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#531dab";
                        e.currentTarget.style.borderColor = "#531dab";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#722ed1";
                        e.currentTarget.style.borderColor = "#722ed1";
                      }}
                    >
                      + Add Unit
                    </Button>
                  ) : (
                    <div style={{ 
                      padding: "12px", 
                      border: "1px solid #d9d9d9", 
                      borderRadius: "4px",
                      backgroundColor: "#fafafa",
                      marginTop: "8px"
                    }}>
                      <Space direction="vertical" style={{ width: "100%" }} size="small">
                        <Input
                          placeholder="Enter unit name"
                          value={newUnitName}
                          onChange={(e) => setNewUnitName(e.target.value)}
                          onPressEnter={handleAddUnit}
                        />
                        <Select
                          value={newUnitStatus}
                          onChange={setNewUnitStatus}
                          style={{ width: "100%" }}
                        >
                          <Select.Option value={true}>Active</Select.Option>
                          <Select.Option value={false}>Inactive</Select.Option>
                        </Select>
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            onClick={handleAddUnit}
                            loading={addingUnit}
                          >
                            Add
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setShowAddUnit(false);
                              setNewUnitName("");
                              setNewUnitStatus(true);
                            }}
                          >
                            Cancel
                          </Button>
                        </Space>
                      </Space>
                    </div>
                  )}
                </div>
              </Form.Item>
              <Form.Item
                name="availability"
                label="Availability"
                initialValue="Yes"
              >
                <Select>
                  <Select.Option value="Yes">Yes</Select.Option>
                  <Select.Option value="No">No</Select.Option>
                </Select>
              </Form.Item>
              {hasGST && (
                <Form.Item
                  name="gstPercent"
                  label="GST %"
                  rules={[
                    { required: true, message: "GST percentage is required when GST is enabled" },
                    { type: "number", min: 0, max: 100, message: "GST must be between 0 and 100" }
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    max={100}
                    precision={2}
                    placeholder="Enter GST percentage"
                  />
                </Form.Item>
              )}
              <Form.Item
                name="discountPercent"
                label="Discount %"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  max={100}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="unitQuantity"
                label="Quantity per Unit (pieces)"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="e.g., 10 pieces per box"
                  onChange={(value) => {
                    const piecePrice = form.getFieldValue('piecePrice');
                    const pieceSalesPrice = form.getFieldValue('pieceSalesPrice');
                    if (piecePrice && value) {
                      const calculatedPurchasePrice = value * piecePrice;
                      form.setFieldValue('purchasePrice', calculatedPurchasePrice);
                    }
                    if (pieceSalesPrice && value) {
                      const calculatedSalesPrice = value * pieceSalesPrice;
                      form.setFieldValue('salesPrice', calculatedSalesPrice);
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="piecePrice"
                label="Piece Price (₹ per piece)"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="e.g., ₹10 per piece"
                  onChange={(value) => {
                    const unitQuantity = form.getFieldValue('unitQuantity');
                    if (unitQuantity && value) {
                      const calculatedPurchasePrice = unitQuantity * value;
                      form.setFieldValue('purchasePrice', calculatedPurchasePrice);
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="purchasePrice"
                label="Unit Purchase Price (₹ per unit)"
                tooltip="Auto-calculated from Quantity × Piece Price, or enter manually"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="Auto-calculated or enter manually"
                />
              </Form.Item>
              <Form.Item
                name="pieceSalesPrice"
                label="Piece Sales Price (₹ per piece)"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="e.g., ₹12 per piece"
                  onChange={(value) => {
                    const unitQuantity = form.getFieldValue('unitQuantity');
                    if (unitQuantity && value) {
                      const calculatedSalesPrice = unitQuantity * value;
                      form.setFieldValue('salesPrice', calculatedSalesPrice);
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="salesPrice"
                label="Unit Sales Price (₹ per unit)"
                tooltip="Auto-calculated from Quantity × Piece Sales Price, or enter manually"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="Auto-calculated or enter manually"
                />
              </Form.Item>
              <Form.Item
                name="lowQtyIndication"
                label="Low Quantity Indication"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="initialStock"
                label="Initial Stock"
                tooltip="Set initial stock quantity when creating product. This will create a stock entry with this opening stock value."
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  precision={2}
                  placeholder="Enter initial stock quantity"
                />
              </Form.Item>
              <Form.Item
                name="description"
                label="Description"
                className="col-span-2"
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            </div>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingId ? "Update Product" : "Add Product"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      {/* Search and Filters */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Search by product name or barcode"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Select
          placeholder="Filter by Brand"
          allowClear
          value={brandFilter}
          onChange={(value) => setBrandFilter(value)}
          style={{ width: 180 }}
        >
          {brands.map((brand) => (
            <Select.Option key={brand.id} value={brand.id}>
              {brand.brandName}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Filter by Category"
          allowClear
          value={categoryFilter}
          onChange={(value) => setCategoryFilter(value)}
          style={{ width: 180 }}
        >
          {categories.map((category) => (
            <Select.Option key={category.id} value={category.id}>
              {category.categoryName}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Filter by Availability"
          allowClear
          value={availabilityFilter}
          onChange={(value) => setAvailabilityFilter(value)}
          style={{ width: 180 }}
        >
          <Select.Option value="Yes">Yes</Select.Option>
          <Select.Option value="No">No</Select.Option>
        </Select>
        <Button
          onClick={() => {
            setSearchTerm('');
            setBrandFilter(null);
            setCategoryFilter(null);
            setAvailabilityFilter(null);
          }}
          disabled={!searchTerm && !brandFilter && !categoryFilter && !availabilityFilter}
        >
          Clear Filters
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={(products || []).filter((p) => {
          const searchMatch =
            p.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barCode?.toLowerCase().includes(searchTerm.toLowerCase());

          const brandMatch = brandFilter
            ? p.brandId === brandFilter
            : true;

          const categoryMatch = categoryFilter
            ? p.categoryId === categoryFilter
            : true;

          const availabilityMatch = availabilityFilter
            ? p.availability === availabilityFilter
            : true;

          return searchMatch && brandMatch && categoryMatch && availabilityMatch;
        })}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default ProductManagement;

