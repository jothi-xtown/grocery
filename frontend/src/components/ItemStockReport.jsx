import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Card,
  Typography,
  message,
} from "antd";
import {
  FilePdfOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { capitalizeTableText } from "../utils/textUtils";

const { Title, Text } = Typography;

const ItemStockReport = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Fetch stock data and generate comprehensive report
  const fetchItems = async () => {
    setLoading(true);
    try {
      const stockRes = await api.get("/api/stock?limit=1000"); // Fetch all stock with high limit
      
      const stockData = stockRes.data.data || [];
      
      // Map stock data to report format
      const reportData = stockData.map((stock) => {
        const product = stock.product || {};
        const currentStock = parseFloat(stock.currentStock) || 0;
        const purchasedQty = parseFloat(stock.purchasedQty) || 0;
        const soldQty = parseFloat(stock.soldQty) || 0;
        const unitPrice = product.purchasePrice || product.salesPrice || 0;
        const totalValue = currentStock * unitPrice;
        
        // Calculate opening stock: currentStock - purchasedQty + soldQty
        // If openingStock is explicitly set and not null, use it; otherwise calculate
        let openingStock = stock.openingStock;
        if (openingStock === null || openingStock === undefined || openingStock === 0) {
          // Calculate opening stock from current stock and transactions
          openingStock = currentStock - purchasedQty + soldQty;
          // Ensure it's not negative
          openingStock = Math.max(0, openingStock);
        } else {
          openingStock = parseFloat(openingStock) || 0;
        }
        
        return {
          id: stock.id,
          productId: stock.productId,
          itemName: product.productName || "Unknown Product",
          partNumber: product.barCode || "-",
          groupName: product.category?.categoryName || "-",
          units: product.unit?.unitName || "-",
          stock: currentStock,
          unitPrice: unitPrice,
          totalValue: totalValue,
          gst: product.hasGST ? (product.gstPercent || 0) : 0,
          openingStock: openingStock,
          purchasedQty: purchasedQty,
          soldQty: soldQty,
          location: stock.location || "-",
        };
      });
      
      setReportData(reportData);
      setItems(reportData); // Keep for compatibility
    } catch (err) {
      console.error("Error fetching stock data", err);
      message.error(err?.response?.data?.message || "Error fetching stock data");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);


  // PDF Export
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Item Stock Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
            .total { font-size: 18px; font-weight: bold; color: #1890ff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Item Stock Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Current Stock</th>
                <th>Opening Stock</th>
                <th>Purchased Qty</th>
                <th>Sold Qty</th>
                <th>Unit Price</th>
                <th>GST %</th>
                <th>Total Value</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.itemName}</td>
                  <td>${item.partNumber || '-'}</td>
                  <td>${item.groupName || '-'}</td>
                  <td>${item.units}</td>
                  <td style="color: ${item.stock > 0 ? 'green' : 'red'}; font-weight: bold;">${item.stock}</td>
                  <td>${item.openingStock || 0}</td>
                  <td>${item.purchasedQty || 0}</td>
                  <td>${item.soldQty || 0}</td>
                  <td>₹${item.unitPrice.toFixed(2)}</td>
                  <td>${item.gst}%</td>
                  <td>₹${item.totalValue.toFixed(2)}</td>
                  <td>${item.location || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="total">Total Stock Value: ₹${reportData.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}</div>
            <p><strong>Total Products:</strong> ${reportData.length}</p>
            <p><strong>Total Current Stock:</strong> ${reportData.reduce((sum, item) => sum + item.stock, 0)}</p>
            <p><strong>Total Purchased:</strong> ${reportData.reduce((sum, item) => sum + (item.purchasedQty || 0), 0)}</p>
            <p><strong>Total Sold:</strong> ${reportData.reduce((sum, item) => sum + (item.soldQty || 0), 0)}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Table columns
  const columns = [
    {
      title: "Product Name",
      dataIndex: "itemName",
      key: "itemName",
      width: 200,
      align: "left",
      render: (text) => capitalizeTableText(text, "itemName"),
    },
    {
      title: "Barcode",
      dataIndex: "partNumber",
      key: "partNumber",
      width: 150,
      align: "left",
      render: (text) => text || "-",
    },
    {
      title: "Category",
      dataIndex: "groupName",
      key: "groupName",
      width: 150,
      align: "left",
      render: (text) => capitalizeTableText(text, "groupName") || "-",
    },
    {
      title: "Unit",
      dataIndex: "units",
      key: "units",
      width: 100,
      align: "center",
      render: (text) => capitalizeTableText(text, "units") || "-",
    },
    {
      title: "Current Stock",
      dataIndex: "stock",
      key: "stock",
      width: 130,
      align: "right",
      render: (value) => (
        <span style={{ 
          color: value > 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          {value || 0}
        </span>
      ),
    },
    {
      title: "Opening Stock",
      dataIndex: "openingStock",
      key: "openingStock",
      width: 130,
      align: "right",
      render: (value) => value || 0,
    },
    {
      title: "Purchased Qty",
      dataIndex: "purchasedQty",
      key: "purchasedQty",
      width: 130,
      align: "right",
      render: (value) => value || 0,
    },
    {
      title: "Sold Qty",
      dataIndex: "soldQty",
      key: "soldQty",
      width: 130,
      align: "right",
      render: (value) => value || 0,
    },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right",
      render: (price) => `₹${(price || 0).toFixed(2)}`,
    },
    {
      title: "GST %",
      dataIndex: "gst",
      key: "gst",
      width: 100,
      align: "right",
      render: (gst) => `${gst || 0}%`,
    },
    {
      title: "Total Value",
      dataIndex: "totalValue",
      key: "totalValue",
      width: 130,
      align: "right",
      render: (value) => `₹${(value || 0).toFixed(2)}`,
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      width: 120,
      align: "left",
      render: (text) => text || "-",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-2">Item Stock Report</Title>
          <Text type="secondary">Current stock levels for all items</Text>
        </div>
        <Button
          icon={<FilePdfOutlined />}
          onClick={exportToPDF}
          type="primary"
          danger
        >
          Export PDF
        </Button>
      </div>

      {/* Report Table */}
      <Card title="Stock Report">
        <Table
          columns={columns}
          dataSource={reportData}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 1200 }}
        />
        {reportData.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <p>No stock data available</p>
            <p className="text-sm">Please select a date range and generate the report</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ItemStockReport;

