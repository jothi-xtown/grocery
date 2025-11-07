import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Table,
  Tag,
  Space,
  Card,
  message,
  Modal,
  Typography,
  Divider,
  Select,
} from "antd";
import {
  FilePdfOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import api from "../service/api";
import { capitalizeTableText } from "../utils/textUtils";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const AccountsManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
  });

  // Fetch accounts
  const fetchAccounts = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      console.log(`🔍 [Accounts] Fetching accounts - page: ${page}, limit: ${limit}`);
      const res = await api.get(`/api/accounts?page=${page}&limit=${limit}`);
      console.log(`✅ [Accounts] Response received:`, res.data);
      
      const accountsData = res.data.data || [];
      setAccounts(accountsData);

      // Update pagination state
      setPagination((prev) => ({
        ...prev,
        current: res.data.page || page,
        total: res.data.total || 0,
        pageSize: res.data.limit || limit,
      }));

      if (accountsData.length === 0) {
        console.log("ℹ️ [Accounts] No accounts found");
      }
    } catch (err) {
      console.error("❌ [Accounts] Error fetching accounts", err);
      console.error("Error response:", err?.response);
      const errorMessage = err?.response?.data?.message 
        || err?.response?.data?.error 
        || err?.message 
        || "Error fetching accounts";
      message.error(errorMessage);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination change
  const handleTableChange = (pagination) => {
    fetchAccounts(pagination.current, pagination.pageSize);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle view account details
  const handleViewAccount = async (record) => {
    try {
      const identifier = record.customerId || record.branchId;
      if (!identifier) {
        message.error("Account identifier not found");
        return;
      }
      const res = await api.get(`/api/accounts/${identifier}`);
      setSelectedAccount(res.data.data || record);
      setShowViewModal(true);
    } catch (err) {
      console.error("Error fetching account details", err);
      message.error("Error loading account details");
    }
  };

  // PDF Export
  const exportToPDF = async () => {
    try {
      const res = await api.get("/api/accounts");
      const allAccounts = res.data.data || [];

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
      <html>
        <head>
          <title>Accounts Report</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
            .positive { color: #ff4d4f; }
            .negative { color: #52c41a; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Accounts Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Customer/Branch Name</th>
                <th>Phone</th>
                <th>Total Billed</th>
                <th>Total Paid</th>
                <th>Due Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${allAccounts
                .filter((a) => {
                  // Filter out accounts with zero amounts (orphaned accounts)
                  if ((a.totalBilled || 0) === 0) return false;
                  
                  const searchMatch =
                    a.customer?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    a.customer?.phone?.includes(searchTerm) ||
                    a.branch?.branchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    a.branch?.phone?.includes(searchTerm);
                  const statusMatch = !statusFilter || a.status === statusFilter;
                  return searchMatch && statusMatch;
                })
                .map(
                  (account) => `
                <tr>
                  <td>${account.customerId ? "Customer" : "Branch"}</td>
                  <td>${account.customer?.customer_name || account.branch?.branchName || "-"}</td>
                  <td>${account.customer?.phone || account.branch?.phone || "-"}</td>
                  <td>₹${(account.totalBilled || 0).toFixed(2)}</td>
                  <td>₹${(account.totalPaid || 0).toFixed(2)}</td>
                  <td class="${(account.dueAmount || 0) > 0 ? "positive" : "negative"}">₹${(account.dueAmount || 0).toFixed(2)}</td>
                  <td>${account.status === "due" ? "Due" : "Clear"}</td>
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
    } catch (err) {
      console.error("Error exporting PDF", err);
      message.error("Error exporting PDF");
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const customerMatch =
        account.customer?.customer_name?.toLowerCase().includes(searchLower) ||
        account.customer?.phone?.includes(searchTerm);
      const branchMatch =
        account.branch?.branchName?.toLowerCase().includes(searchLower) ||
        account.branch?.phone?.includes(searchTerm);
      if (!customerMatch && !branchMatch) return false;
    }

    // Filter by status
    if (statusFilter && account.status !== statusFilter) return false;

    // Filter out accounts with zero amounts (orphaned accounts)
    // Only show accounts that have invoices (totalBilled > 0)
    if ((account.totalBilled || 0) === 0) return false;

    return true;
  });

  // Table columns
  const columns = [
    {
      title: "Customer/Branch",
      key: "name",
      render: (_, record) => (
        <div style={{ minWidth: 150, wordWrap: "break-word" }}>
          {capitalizeTableText(record.customer?.customer_name || record.branch?.branchName, record.customer ? "customer_name" : "branchName") || "-"}
        </div>
      ),
    },
    {
      title: "Type",
      key: "type",
      render: (_, record) => (
        <Tag color={record.customerId ? "blue" : "purple"}>
          {record.customerId ? "Customer" : "Branch"}
        </Tag>
      ),
    },
    {
      title: "Phone",
      key: "phone",
      render: (_, record) => record.customer?.phone || record.branch?.phone || "-",
    },
    {
      title: "Total Billed",
      dataIndex: "totalBilled",
      key: "totalBilled",
      align: "right",
      render: (amount) => `₹${(amount || 0).toFixed(2)}`,
      sorter: (a, b) => (a.totalBilled || 0) - (b.totalBilled || 0),
    },
    {
      title: "Total Paid",
      dataIndex: "totalPaid",
      key: "totalPaid",
      align: "right",
      render: (amount) => `₹${(amount || 0).toFixed(2)}`,
      sorter: (a, b) => (a.totalPaid || 0) - (b.totalPaid || 0),
    },
    {
      title: "Due Amount",
      dataIndex: "dueAmount",
      key: "dueAmount",
      align: "right",
      render: (amount) => {
        const numAmount = parseFloat(amount) || 0;
        const color = numAmount > 0 ? "#ff4d4f" : "#52c41a";
        return (
          <span style={{ color, fontWeight: "bold" }}>
            ₹{numAmount.toFixed(2)}
          </span>
        );
      },
      sorter: (a, b) => (a.dueAmount || 0) - (b.dueAmount || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusMap = {
          due: { color: "red", text: "Due" },
          clear: { color: "green", text: "Clear" },
        };
        const config = statusMap[status] || { color: "default", text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: "Due", value: "due" },
        { text: "Clear", value: "clear" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="medium"
            icon={<EyeOutlined />}
            onClick={() => handleViewAccount(record)}
            title="View Details"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accounts Management</h1>
        <Space>
          <Button
            icon={<FilePdfOutlined />}
            onClick={exportToPDF}
            type="primary"
            danger
          >
            Export PDF
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 20, display: "flex", gap: "10px", alignItems: "center" }}>
        <Input.Search
          placeholder="Search by customer/branch name or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
        />

        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: 150 }}
        >
          <Select.Option value="due">Due</Select.Option>
          <Select.Option value="clear">Clear</Select.Option>
        </Select>

        <Button
          onClick={() => {
            setSearchTerm("");
            setStatusFilter(null);
          }}
          disabled={!searchTerm && !statusFilter}
        >
          Clear Filters
        </Button>
      </div>

            {/* Table */}
            <Table
              columns={columns}
              dataSource={filteredAccounts}
              rowKey="id"
              loading={loading}
              pagination={{
                ...pagination,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} accounts`,
              }}
              onChange={handleTableChange}
              locale={{
                emptyText: accounts.length === 0 && !loading
                  ? "No accounts found. Accounts are created automatically when invoices are generated."
                  : "No accounts match the current filters"
              }}
            />

      {/* View Account Details Modal */}
      <Modal
        title={`Account Details - ${selectedAccount?.customer?.customer_name || selectedAccount?.branch?.branchName || ""}`}
        open={showViewModal}
        onCancel={() => {
          setShowViewModal(false);
          setSelectedAccount(null);
        }}
        footer={[
          <Button key="close" onClick={() => setShowViewModal(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedAccount && (
          <div>
            <Divider orientation="left">{selectedAccount.customerId ? "Customer Information" : "Branch Information"}</Divider>
            <div className="mb-4">
              {selectedAccount.customerId ? (
                <>
                  <Text strong>Customer Name: </Text>
                  {selectedAccount.customer?.customer_name || "-"}
                  <br />
                  <Text strong>Phone: </Text>
                  {selectedAccount.customer?.phone || "-"}
                  <br />
                  {selectedAccount.customer?.pincode && (
                    <>
                      <Text strong>Pincode: </Text>
                      {selectedAccount.customer.pincode}
                      <br />
                    </>
                  )}
                  {selectedAccount.customer?.gst_pan_number && (
                    <>
                      <Text strong>GST/PAN: </Text>
                      {selectedAccount.customer.gst_pan_number}
                      <br />
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text strong>Branch Name: </Text>
                  {selectedAccount.branch?.branchName || "-"}
                  <br />
                  <Text strong>Phone: </Text>
                  {selectedAccount.branch?.phone || "-"}
                  <br />
                  {selectedAccount.branch?.email && (
                    <>
                      <Text strong>Email: </Text>
                      {selectedAccount.branch.email}
                      <br />
                    </>
                  )}
                  {selectedAccount.branch?.address && (
                    <>
                      <Text strong>Address: </Text>
                      {selectedAccount.branch.address}
                      <br />
                    </>
                  )}
                </>
              )}
            </div>

            <Divider orientation="left">Account Summary</Divider>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Text strong>Total Billed:</Text>
                <Text>₹{(selectedAccount.totalBilled || 0).toFixed(2)}</Text>
              </div>
              <div className="flex justify-between mb-2">
                <Text strong>Total Paid:</Text>
                <Text>₹{(selectedAccount.totalPaid || 0).toFixed(2)}</Text>
              </div>
              <div className="flex justify-between mb-2">
                <Text strong>Due Amount:</Text>
                <Text
                  type={selectedAccount.dueAmount > 0 ? "danger" : "success"}
                  strong
                >
                  ₹{(selectedAccount.dueAmount || 0).toFixed(2)}
                </Text>
              </div>
              <div className="flex justify-between mb-2">
                <Text strong>Status:</Text>
                <Tag
                  color={selectedAccount.status === "due" ? "red" : "green"}
                >
                  {selectedAccount.status === "due" ? "Due" : "Clear"}
                </Tag>
              </div>
            </div>

            {selectedAccount.lastBill && (
              <>
                <Divider orientation="left">Last Bill</Divider>
                <div className="mb-4">
                  <Text strong>Bill No: </Text>
                  {selectedAccount.lastBill.billNo || "-"}
                  <br />
                  <Text strong>Amount: </Text>
                  ₹{(selectedAccount.lastBill.grandTotal || selectedAccount.lastBill.totalAmount || 0).toFixed(2)}
                  <br />
                  <Text strong>Date: </Text>
                  {selectedAccount.lastBill.createdAt
                    ? dayjs(selectedAccount.lastBill.createdAt).format(
                        "DD/MM/YYYY"
                      )
                    : "-"}
                </div>
              </>
            )}

            {selectedAccount.payments &&
              selectedAccount.payments.length > 0 && (
                <>
                  <Divider orientation="left">Payment History</Divider>
                  <Table
                    columns={[
                      {
                        title: "Date",
                        dataIndex: "createdAt",
                        key: "createdAt",
                        render: (date) =>
                          date ? dayjs(date).format("DD/MM/YYYY") : "-",
                      },
                      {
                        title: "Payment Mode",
                        dataIndex: "paymentMode",
                        key: "paymentMode",
                        render: (mode) => mode?.toUpperCase() || "-",
                      },
                      {
                        title: "Amount Paid",
                        dataIndex: "amountPaid",
                        key: "amountPaid",
                        align: "right",
                        render: (amount) => `₹${(amount || 0).toFixed(2)}`,
                      },
                    ]}
                    dataSource={selectedAccount.payments || []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccountsManagement;
