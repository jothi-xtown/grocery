import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Card,
  Typography,
  message,
  Row,
  Col,
  Statistic,
  Select,
  Space,
  Spin,
} from "antd";
import {
  FilePdfOutlined,
  DollarOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { capitalizeTableText } from "../utils/textUtils";

const { Title, Text } = Typography;

const AccountsReceivableReport = () => {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/api/customers?limit=1000");
        setCustomers(res.data.data || []);
      } catch (err) {
        console.error("Error fetching customers", err);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch accounts receivable report
  const fetchReceivablesReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customerId) params.append("customerId", customerId);

      const res = await api.get(`/api/accounts/reports/receivables?${params.toString()}`);
      
      if (res.data.success) {
        setReportData(res.data.data.receivablesData || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (err) {
      console.error("Error fetching receivables report", err);
      message.error(err?.response?.data?.message || "Error fetching receivables report");
      setReportData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivablesReport();
  }, [customerId]);

  // PDF Export
  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Accounts Receivable Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
            .total { font-size: 18px; font-weight: bold; color: #1890ff; }
            .overdue { color: #ff4d4f; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Accounts Receivable Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Branch</th>
                <th>Phone</th>
                <th>Total Billed</th>
                <th>Total Paid</th>
                <th>Due Amount</th>
                <th>Days Overdue</th>
                <th>Aging Bucket</th>
                <th>Last Bill No</th>
                <th>Last Bill Date</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.customer || '-'}</td>
                  <td>${item.branch || '-'}</td>
                  <td>${item.phone || '-'}</td>
                  <td>₹${item.totalBilled || '0.00'}</td>
                  <td>₹${item.totalPaid || '0.00'}</td>
                  <td class="${item.daysOverdue > 30 ? 'overdue' : ''}">₹${item.dueAmount || '0.00'}</td>
                  <td class="${item.daysOverdue > 30 ? 'overdue' : ''}">${item.daysOverdue || 0}</td>
                  <td>${item.agingBucket || '-'}</td>
                  <td>${item.lastBillNo || '-'}</td>
                  <td>${item.lastBillDate || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${summary ? `
          <div class="summary">
            <div class="total">Total Receivables: ₹${summary.totalReceivables?.toFixed(2) || '0.00'}</div>
            <p><strong>Customers with Dues:</strong> ${summary.customersWithDues || 0}</p>
            <p><strong>Average Days Overdue:</strong> ${summary.avgDaysOverdue || 0} days</p>
            <p><strong>Aging Analysis:</strong></p>
            <ul>
              <li>0-30 days: ₹${summary.agingBuckets?.['0-30']?.toFixed(2) || '0.00'}</li>
              <li>31-60 days: ₹${summary.agingBuckets?.['31-60']?.toFixed(2) || '0.00'}</li>
              <li>61-90 days: ₹${summary.agingBuckets?.['61-90']?.toFixed(2) || '0.00'}</li>
              <li>90+ days: ₹${summary.agingBuckets?.['90+']?.toFixed(2) || '0.00'}</li>
            </ul>
          </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Table columns
  const columns = [
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      width: 180,
      align: "left",
      render: (text) => capitalizeTableText(text, "customer") || "-",
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      width: 150,
      align: "left",
      render: (text) => capitalizeTableText(text, "branch") || "-",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 120,
      align: "left",
      render: (text) => text || "-",
    },
    {
      title: "Total Billed",
      dataIndex: "totalBilled",
      key: "totalBilled",
      width: 130,
      align: "right",
      render: (value) => `₹${parseFloat(value || 0).toFixed(2)}`,
    },
    {
      title: "Total Paid",
      dataIndex: "totalPaid",
      key: "totalPaid",
      width: 130,
      align: "right",
      render: (value) => `₹${parseFloat(value || 0).toFixed(2)}`,
    },
    {
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
      width: 130,
      align: "right",
      render: (value, record) => (
        <span style={{ 
          fontWeight: "bold", 
          color: parseFloat(record.daysOverdue || 0) > 30 ? "#ff4d4f" : "#1890ff" 
        }}>
          ₹{parseFloat(value || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: "Days Overdue",
      dataIndex: "daysOverdue",
      key: "daysOverdue",
      width: 120,
      align: "center",
      render: (value) => (
        <span style={{ 
          color: parseFloat(value || 0) > 30 ? "#ff4d4f" : "#666",
          fontWeight: parseFloat(value || 0) > 30 ? "bold" : "normal"
        }}>
          {value || 0}
        </span>
      ),
    },
    {
      title: "Aging Bucket",
      dataIndex: "agingBucket",
      key: "agingBucket",
      width: 110,
      align: "center",
      render: (bucket) => {
        const colorMap = {
          "0-30": "#52c41a",
          "31-60": "#faad14",
          "61-90": "#fa8c16",
          "90+": "#ff4d4f",
        };
        return (
          <span style={{ color: colorMap[bucket] || "#666", fontWeight: "bold" }}>
            {bucket || "-"}
          </span>
        );
      },
    },
    {
      title: "Last Bill No",
      dataIndex: "lastBillNo",
      key: "lastBillNo",
      width: 150,
      align: "left",
      render: (text) => text || "-",
    },
    {
      title: "Last Bill Date",
      dataIndex: "lastBillDate",
      key: "lastBillDate",
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
          <Title level={2} className="mb-2">Accounts Receivable Report</Title>
          <Text type="secondary">Customer dues and aging analysis</Text>
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

      {/* Filters */}
      <Card className="mb-8">
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Text strong>Customer:</Text>
              <Select
                style={{ width: "100%", marginTop: 8 }}
                value={customerId}
                onChange={setCustomerId}
                allowClear
                placeholder="All Customers"
              >
                {customers.map((customer) => (
                  <Select.Option key={customer.id} value={customer.id}>
                    {customer.customer_name}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <>
          <Row gutter={[24, 24]} className="mb-8">
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Total Receivables"
                  value={summary.totalReceivables || 0}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: "#ff4d4f" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Customers with Dues"
                  value={summary.customersWithDues || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Avg Days Overdue"
                  value={summary.avgDaysOverdue || 0}
                  suffix="days"
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: "#fa8c16" }}
                />
              </Card>
            </Col>
          </Row>

          {/* Aging Analysis */}
          <Card title="Aging Analysis" className="mb-8">
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="0-30 Days"
                    value={summary.agingBuckets?.["0-30"] || 0}
                    prefix={<DollarOutlined />}
                    precision={2}
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="31-60 Days"
                    value={summary.agingBuckets?.["31-60"] || 0}
                    prefix={<DollarOutlined />}
                    precision={2}
                    valueStyle={{ color: "#faad14" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="61-90 Days"
                    value={summary.agingBuckets?.["61-90"] || 0}
                    prefix={<DollarOutlined />}
                    precision={2}
                    valueStyle={{ color: "#fa8c16" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic
                    title="90+ Days"
                    value={summary.agingBuckets?.["90+"] || 0}
                    prefix={<DollarOutlined />}
                    precision={2}
                    valueStyle={{ color: "#ff4d4f" }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </>
      )}

      {/* Report Table */}
      <Card title="Receivables Details">
        <Spin spinning={loading}>
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
        </Spin>
        {reportData.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <p>No receivables data available</p>
            <p className="text-sm">All accounts are clear</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccountsReceivableReport;

