// import { useState, useEffect } from "react";
// import {
//   Card,
//   Table,
//   Button,
//   Input,
//   Space,
//   Typography,
//   Tag,
//   Row,
//   Col,
//   Statistic,
//   message,
//   Modal,
//   Form,
//   Select,
//   InputNumber,
// } from "antd";
// import {
//   ReloadOutlined,
//   PlusOutlined,
// } from "@ant-design/icons";
// import api from "../service/api";

// const { Title, Text } = Typography;

// const InventoryManagement = () => {
//   const [loading, setLoading] = useState(false);
//   const [items, setItems] = useState([]);
//   const [stockData, setStockData] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [showAddForm, setShowAddForm] = useState(false);
//   const [addForm] = Form.useForm();
//   const [itemInstances, setItemInstances] = useState([]);

//   // Fetch all data
//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const [itemsRes, instancesRes] = await Promise.all([
//         api.get("/api/items"),
//         api.get("/api/itemInstances")
//       ]);

//       const items = itemsRes.data.data || [];
//       const instances = instancesRes.data.data || [];

//       setItems(items);
//       setItemInstances(instances);
//       setStockData(items); // Items now have stock field directly
//     } catch (err) {
//       console.error("Error fetching inventory data", err);
//       message.error("Error fetching inventory data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle adding item instance
//   const handleAddStock = async (values) => {
//     try {
//       const { itemId, quantity, nextServiceRPM, notes } = values;

//       const payload = {
//         itemId,
//         quantity,
//         nextServiceRPM: nextServiceRPM ? parseInt(nextServiceRPM) : null,
//         notes
//       };

//       const response = await api.post("/api/stockTransactions/add-stock", payload);
//       message.success(response.data.message);
//       setShowAddForm(false);
//       addForm.resetFields();
//       fetchData();
//     } catch (err) {
//       console.error("Error adding stock", err);
//       message.error("Error adding stock");
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   // Stock columns
//   const stockColumns = [
//     {
//       title: "Item Name",
//       dataIndex: "itemName",
//       key: "itemName",
//       render: (text, record) => (
//         <div>
//           <Text strong>{text}</Text>
//           <br />
//           <Text type="secondary" style={{ fontSize: '12px' }}>
//             {record.partNumber}
//           </Text>
//         </div>
//       ),
//     },
//     {
//       title: "Stock Available",
//       dataIndex: "stock",
//       key: "stock",
//       render: (value) => (
//         <Text strong style={{
//           color: value > 0 ? '#52c41a' : '#ff4d4f',
//           fontSize: '16px'
//         }}>
//           {value || 0}
//         </Text>
//       ),
//     },
//     {
//       title: "Unit Price",
//       dataIndex: "purchaseRate",
//       key: "purchaseRate",
//       render: (value) => `₹${value || 0}`,
//     },
//     {
//       title: "GST %",
//       dataIndex: "gst",
//       key: "gst",
//       render: (value) => `${value || 0}%`,
//     },
//     {
//       title: "Can Be Fitted",
//       dataIndex: "canBeFitted",
//       key: "canBeFitted",
//       render: (value) => (
//         <Tag color={value ? "blue" : "default"}>
//           {value ? "Yes" : "No"}
//         </Tag>
//       ),
//     },
//   ];


//   // Calculate summary statistics
//   const calculateSummary = () => {
//     const totalItems = stockData.length;
//     const totalStock = stockData.reduce((sum, item) => sum + (item.stock || 0), 0);
//     const itemsInStock = stockData.filter(item => (item.stock || 0) > 0).length;
//     const itemsOutOfStock = stockData.filter(item => (item.stock || 0) === 0).length;

//     return {
//       totalItems,
//       totalStock,
//       itemsInStock,
//       itemsOutOfStock,
//     };
//   };

//   const summary = calculateSummary();


//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <div>
//           <Title level={2} className="mb-2">Inventory Management</Title>
//           <Text type="secondary">Track stock levels and transactions</Text>
//         </div>
//         <Space>
//           <Button
//             icon={<ReloadOutlined />}
//             onClick={fetchData}
//             loading={loading}
//           >
//             Refresh
//           </Button>
//         </Space>
//       </div>

//       {/* Summary Statistics */}
//       <Row gutter={[16, 16]}>
//         <Col xs={24} md={12} lg={6}>
//           <Card>
//             <Statistic
//               title="Total Items"
//               value={summary.totalItems}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} md={12} lg={6}>
//           <Card>
//             <Statistic
//               title="Total Stock"
//               value={summary.totalStock}
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} md={12} lg={6}>
//           <Card>
//             <Statistic
//               title="Items In Stock"
//               value={summary.itemsInStock}
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} md={12} lg={6}>
//           <Card>
//             <Statistic
//               title="Items Out of Stock"
//               value={summary.itemsOutOfStock}
//               valueStyle={{ color: '#ff4d4f' }}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* Stock Table */}
//       <Card>
//         <div className="mb-4 flex justify-between items-center">
//           <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
//             <Input.Search
//               placeholder="Search items..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               style={{ maxWidth: 300 }}
//             />
//             <Button
//               onClick={() => setSearchTerm('')}
//               disabled={!searchTerm}
//             >
//               Clear Filters
//             </Button>
//           </div>
//         </div>
//         <Table
//           columns={stockColumns}
//           dataSource={stockData.filter(item =>
//             item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//             item.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
//           )}
//           rowKey="id"
//           loading={loading}
//           pagination={{ pageSize: 20 }}
//           scroll={{ x: 800 }}
//         />
//       </Card>

//       {/* Add Stock flow removed: handled via Item page and auto on PO receive */}
//     </div>
//   );
// };

// export default InventoryManagement;

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Statistic,
  message,
} from "antd";
import { MdOutlineInventory2, MdInventory } from "react-icons/md";
import { ReloadOutlined, ToolOutlined, DatabaseOutlined, InboxOutlined, DropboxOutlined } from "@ant-design/icons";
import api from "../service/api";

const { Title, Text } = Typography;

const InventoryManagement = () => {
  const [loading, setLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  const [summary, setSummary] = useState({
    totalItems: 0,
    totalStock: 0,
    itemsInStock: 0,
    itemsOutOfStock: 0,
  });

  // ✅ Fetch products and stock, then merge them
  const fetchPaginatedData = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      // Fetch products and stock in parallel
      const [productsRes, stockRes] = await Promise.all([
        api.get(`/api/products?page=${page}&limit=${limit}`),
        api.get("/api/stock?limit=1000"), // Get all stock entries to merge
      ]);

      const products = productsRes.data.data || [];
      const stockEntries = stockRes.data.data || [];

      // Create a map of productId -> stock entry
      const stockMap = {};
      stockEntries.forEach((stock) => {
        if (stock && stock.productId) {
          stockMap[stock.productId] = stock;
        }
      });

      // Merge products with stock data
      const mergedData = products.map((product) => {
        const stock = stockMap[product.id];
        return {
          ...product,
          stock: stock && stock.currentStock !== null && stock.currentStock !== undefined
            ? parseFloat(stock.currentStock) || 0
            : 0,
          openingStock: stock && stock.openingStock !== null && stock.openingStock !== undefined
            ? parseFloat(stock.openingStock) || 0
            : 0,
          purchasedQty: stock && stock.purchasedQty !== null && stock.purchasedQty !== undefined
            ? parseFloat(stock.purchasedQty) || 0
            : 0,
          soldQty: stock && stock.soldQty !== null && stock.soldQty !== undefined
            ? parseFloat(stock.soldQty) || 0
            : 0,
          stockId: stock ? stock.id : null,
          location: stock ? stock.location : null,
        };
      });

      setInventoryData(mergedData);

      setPagination((prev) => ({
        ...prev,
        current: productsRes.data.page || page,
        total: productsRes.data.total || 0,
      }));
    } catch (err) {
      console.error("Error fetching inventory data", err);
      const errorData = err?.response?.data;
      const errorMessage = errorData?.message 
        || errorData?.error 
        || err?.message 
        || "Error fetching inventory data";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch overall summary (all products without pagination)
  const fetchSummary = async () => {
    try {
      const [productsRes, stockRes] = await Promise.all([
        api.get("/api/products?limit=1000"), // Fetch all products
        api.get("/api/stock?limit=1000"), // Fetch all stock entries
      ]);

      const products = productsRes.data.data || [];
      const stockEntries = stockRes.data.data || [];

      // Create stock map
      const stockMap = {};
      stockEntries.forEach((stock) => {
        if (stock && stock.productId) {
          stockMap[stock.productId] = stock;
        }
      });

      // Calculate summary
      const totalItems = products.length;
      let totalStock = 0;
      let itemsInStock = 0;
      let itemsOutOfStock = 0;

      products.forEach((product) => {
        const stock = stockMap[product.id];
        // Parse currentStock as number, handle null/undefined/string values
        const currentStock = stock && stock.currentStock !== null && stock.currentStock !== undefined
          ? parseFloat(stock.currentStock) || 0
          : 0;
        totalStock += currentStock;
        if (currentStock > 0) {
          itemsInStock++;
        } else {
          itemsOutOfStock++;
        }
      });

      console.log("📊 [Inventory] Summary calculated:", {
        totalItems,
        totalStock,
        itemsInStock,
        itemsOutOfStock,
        stockEntriesCount: stockEntries.length,
        productsCount: products.length,
      });

      setSummary({
        totalItems,
        totalStock,
        itemsInStock,
        itemsOutOfStock,
      });
    } catch (err) {
      console.error("❌ [Inventory] Error fetching summary:", err);
      console.error("Error details:", err?.response?.data || err?.message);
    }
  };

  useEffect(() => {
    fetchPaginatedData(pagination.current, pagination.pageSize);
    fetchSummary(); // ✅ Fetch summary once
  }, []);

  // ✅ Handle pagination change
  const handleTableChange = (pagination) => {
    fetchPaginatedData(pagination.current, pagination.pageSize);
  };

  const stockColumns = [
    {
      title: "Barcode",
      dataIndex: "barCode",
      key: "barCode",
      width: 120,
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.brand?.brandName && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Brand: {record.brand.brandName}
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: ["category", "categoryName"],
      key: "category",
      render: (categoryName) => categoryName || "-",
    },
    {
      title: "Unit",
      dataIndex: ["unit", "unitName"],
      key: "unit",
      render: (unitName) => unitName || "-",
    },
    {
      title: "Stock Available",
      dataIndex: "stock",
      key: "stock",
      render: (value, record) => {
        const stockValue = value || 0;
        const lowQty = record.lowQtyIndication || 0;
        let color = "#52c41a"; // green
        if (stockValue === 0) {
          color = "#ff4d4f"; // red
        } else if (lowQty > 0 && stockValue <= lowQty) {
          color = "#faad14"; // orange
        }
        return (
          <Text strong style={{ color, fontSize: "16px" }}>
            {stockValue.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: "Unit Purchase Price",
      dataIndex: "purchasePrice",
      key: "purchasePrice",
      render: (value) => value ? `₹${parseFloat(value).toFixed(2)}` : "-",
    },
    {
      title: "Unit Sales Price",
      dataIndex: "salesPrice",
      key: "salesPrice",
      render: (value) => value ? `₹${parseFloat(value).toFixed(2)}` : "-",
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
      title: "Location",
      dataIndex: "location",
      key: "location",
      render: (location) => location || "-",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="mb-2">
            Inventory Management
          </Title>
          <Text type="secondary">Track stock levels and transactions</Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchPaginatedData(pagination.current, pagination.pageSize);
              fetchSummary();
            }}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* ✅ Summary cards now show total data (not page data) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card>
            
            <Statistic
              title="Total Products"
              prefix={<ToolOutlined style={{ fontSize: '22px', color: '#1890ff', marginRight: '5px', marginTop: "5px" }} />}
              value={summary.totalItems}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic
              title="Total Stock"
              value={summary.totalStock}
              prefix={<DatabaseOutlined style={{ fontSize: '22px', color: '#52c41a', marginRight: '5px', marginTop: "5px" }}/>}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic
              title="Products In Stock"
              value={summary.itemsInStock}
              prefix={<InboxOutlined style={{ fontSize: '22px', color: '#52c41a', marginRight: '5px', marginTop: "5px" }}/>}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic
              title="Products Out of Stock"
              value={summary.itemsOutOfStock}
              prefix={<DropboxOutlined style={{ fontSize: '22px', color: '#ff4d4f', marginRight: '5px', marginTop: "5px" }}/>}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div className="mb-4 flex justify-between items-center">
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Input.Search
              placeholder="Search products by name, barcode, brand, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 400 }}
            />
            <Button onClick={() => setSearchTerm("")} disabled={!searchTerm}>
              Clear Filters
            </Button>
          </div>
        </div>

        <Table
          columns={stockColumns}
          dataSource={inventoryData.filter(
            (item) =>
              item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.barCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.brand?.brandName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.category?.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
          )}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} products`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default InventoryManagement;
