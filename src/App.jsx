import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  LineChartOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const STORAGE_KEY = 'personal_budget_funds_v1';
const TOTAL_KEY = 'personal_budget_total_v1';

const FUND_COLORS = [
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0891b2',
  '#dc2626',
  '#4f46e5',
  '#0f766e',
];

const createId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatMoney = (value = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (date) => dayjs(date).format('DD/MM/YYYY');

// Start with no sample funds; user will create the first fund manually
// (sample data removed per user request)

function getFundStats(fund) {
  const income = fund.transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expense = fund.transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const availableBudget = Number(fund.initialAmount || 0) + income;
  const remaining = availableBudget - expense;
  const spentPercent = availableBudget > 0 ? Math.min(Math.round((expense / availableBudget) * 100), 100) : 0;

  return {
    income,
    expense,
    availableBudget,
    remaining,
    spentPercent,
    isNegative: remaining < 0,
  };
}

function getDailySummary(transactions) {
  const map = transactions.reduce((acc, item) => {
    const key = item.date;
    if (!acc[key]) {
      acc[key] = {
        date: key,
        income: 0,
        expense: 0,
      };
    }

    if (item.type === 'income') acc[key].income += Number(item.amount || 0);
    if (item.type === 'expense') acc[key].expense += Number(item.amount || 0);
    return acc;
  }, {});

  return Object.values(map).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
}

function App() {
  const [funds, setFunds] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error(error);
  return [];
    }
  });
  const [totalMoney, setTotalMoney] = useState(() => {
    try {
      const raw = localStorage.getItem(TOTAL_KEY);
      return raw ? Number(JSON.parse(raw)) : 0;
    } catch (error) {
      console.error(error);
      return 0;
    }
  });

  const [totalModalOpen, setTotalModalOpen] = useState(false);
  const [totalForm] = Form.useForm();

  const [keyword, setKeyword] = useState('');
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [transactionModalFund, setTransactionModalFund] = useState(null);
  const [detailFundId, setDetailFundId] = useState(null);
  const [fundForm] = Form.useForm();
  const [transactionForm] = Form.useForm();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(funds));
  }, [funds]);

  useEffect(() => {
    try {
      localStorage.setItem(TOTAL_KEY, JSON.stringify(Number(totalMoney || 0)));
    } catch (error) {
      console.error(error);
    }
  }, [totalMoney]);

  const totals = useMemo(() => {
    return funds.reduce(
      (acc, fund) => {
        const stats = getFundStats(fund);
        acc.initial += Number(fund.initialAmount || 0);
        acc.income += stats.income;
        acc.expense += stats.expense;
        acc.remaining += stats.remaining;
        return acc;
      },
      { initial: 0, income: 0, expense: 0, remaining: 0 },
    );
  }, [funds]);

  const visibleFunds = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return funds;
    return funds.filter((fund) => {
      return `${fund.name} ${fund.description}`.toLowerCase().includes(normalizedKeyword);
    });
  }, [funds, keyword]);

  const detailFund = funds.find((fund) => fund.id === detailFundId);

  const openCreateFundModal = () => {
    setEditingFund(null);
    fundForm.resetFields();
    fundForm.setFieldsValue({ color: FUND_COLORS[0], initialAmount: 0 });
    setFundModalOpen(true);
  };

  const openEditFundModal = (fund) => {
    setEditingFund(fund);
    fundForm.setFieldsValue({
      name: fund.name,
      description: fund.description,
      initialAmount: fund.initialAmount,
      color: fund.color,
    });
    setFundModalOpen(true);
  };

  const handleSaveFund = async () => {
    const values = await fundForm.validateFields();

    if (editingFund) {
      setFunds((currentFunds) =>
        currentFunds.map((fund) =>
          fund.id === editingFund.id
            ? {
                ...fund,
                name: values.name.trim(),
                description: values.description?.trim() || '',
                initialAmount: Number(values.initialAmount || 0),
                color: values.color,
              }
            : fund,
        ),
      );
      message.success('Đã cập nhật quỹ');
    } else {
      const newFund = {
        id: createId(),
        name: values.name.trim(),
        description: values.description?.trim() || '',
        initialAmount: Number(values.initialAmount || 0),
        color: values.color,
        createdAt: new Date().toISOString(),
        transactions: [],
      };
      setFunds((currentFunds) => [newFund, ...currentFunds]);
      message.success('Đã tạo quỹ mới');
    }

    setFundModalOpen(false);
    setEditingFund(null);
    fundForm.resetFields();
  };

  const handleDeleteFund = (fundId) => {
    setFunds((currentFunds) => currentFunds.filter((fund) => fund.id !== fundId));
    if (detailFundId === fundId) setDetailFundId(null);
    message.success('Đã xóa quỹ');
  };

  const openTransactionModal = (fund) => {
    setTransactionModalFund(fund);
    transactionForm.resetFields();
    transactionForm.setFieldsValue({
      type: 'expense',
      date: dayjs(),
    });
  };

  const handleAddTransaction = async () => {
    const values = await transactionForm.validateFields();
    const newTransaction = {
      id: createId(),
      type: values.type,
      amount: Number(values.amount || 0),
      date: values.date.format('YYYY-MM-DD'),
      note: values.note?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    setFunds((currentFunds) =>
      currentFunds.map((fund) =>
        fund.id === transactionModalFund.id
          ? {
              ...fund,
              transactions: [newTransaction, ...fund.transactions],
            }
          : fund,
      ),
    );

    message.success(newTransaction.type === 'expense' ? 'Đã ghi khoản chi' : 'Đã ghi khoản thu');
    setTransactionModalFund(null);
    transactionForm.resetFields();
  };

  const handleDeleteTransaction = (fundId, transactionId) => {
    setFunds((currentFunds) =>
      currentFunds.map((fund) =>
        fund.id === fundId
          ? {
              ...fund,
              transactions: fund.transactions.filter((item) => item.id !== transactionId),
            }
          : fund,
      ),
    );
    message.success('Đã xóa giao dịch');
  };

  const handleResetDemoData = () => {
  setFunds([]);
  message.success('Đã xóa mọi dữ liệu và khôi phục trạng thái trống');
  };

  const handleClearAll = () => {
    setFunds([]);
    localStorage.removeItem(STORAGE_KEY);
    setDetailFundId(null);
    message.success('Đã xóa toàn bộ dữ liệu trên thiết bị này');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(funds, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quan-ly-quy-${dayjs().format('YYYYMMDD-HHmm')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error('Invalid format');
        setFunds(parsed);
        message.success('Đã nhập dữ liệu JSON');
      } catch (error) {
        console.error(error);
        message.error('File JSON không hợp lệ');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const transactionColumns = detailFund
    ? [
        {
          title: 'Ngày',
          dataIndex: 'date',
          key: 'date',
          render: (date) => <Text strong>{formatDate(date)}</Text>,
          sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
          defaultSortOrder: 'descend',
        },
        {
          title: 'Loại',
          dataIndex: 'type',
          key: 'type',
          render: (type) =>
            type === 'expense' ? <Tag color="red">Chi</Tag> : <Tag color="green">Thu</Tag>,
        },
        {
          title: 'Số tiền',
          dataIndex: 'amount',
          key: 'amount',
          align: 'right',
          render: (amount, row) => (
            <Text type={row.type === 'expense' ? 'danger' : 'success'} strong>
              {row.type === 'expense' ? '-' : '+'}
              {formatMoney(amount)}
            </Text>
          ),
        },
        {
          title: 'Ghi chú',
          dataIndex: 'note',
          key: 'note',
          render: (note) => note || <Text type="secondary">Không có</Text>,
        },
        {
          title: '',
          key: 'action',
          width: 70,
          render: (_, row) => (
            <Popconfirm
              title="Xóa giao dịch này?"
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => handleDeleteTransaction(detailFund.id, row.id)}
            >
              <Button danger type="text" icon={<DeleteOutlined />} />
            </Popconfirm>
          ),
        },
      ]
    : [];

  const detailStats = detailFund ? getFundStats(detailFund) : null;
  const dailySummary = detailFund ? getDailySummary(detailFund.transactions) : [];

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <Tag color="blue" className="hero-tag">
            Local Storage App
          </Tag>
          <Title level={1}>Quản lý quỹ thu chi cá nhân</Title>
          <Paragraph className="hero-description">
            Tạo nhiều quỹ riêng, ghi thu/chi theo ngày, theo dõi số tiền đã dùng và số tiền còn lại ngay trên thiết bị của bạn.
          </Paragraph>
        </div>

        <Space direction="vertical" align="end">
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Tổng tiền hiện có</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'flex-end' }}>
              <Title level={3} style={{ margin: 0 }}>
                {formatMoney(totalMoney)}
              </Title>
              <div>
                <Text type="secondary">Chưa phân bổ</Text>
                <div>
                  <Text className={totalMoney - totals.initial < 0 ? 'negative-money' : 'positive-money'} strong>
                    {formatMoney(Number(totalMoney || 0) - Number(totals.initial || 0))}
                  </Text>
                </div>
              </div>
            </div>
          </div>

          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Xuất JSON
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => document.getElementById('import-json').click()}>
              Nhập JSON
            </Button>
            <input id="import-json" type="file" accept="application/json" hidden onChange={handleImport} />
            <Button onClick={() => { totalForm.setFieldsValue({ total: Number(totalMoney || 0) }); setTotalModalOpen(true); }}>Thiết lập tổng tiền</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateFundModal}>
              Tạo quỹ
            </Button>
          </Space>
        </Space>
      </section>

      <Row gutter={[16, 16]} className="summary-grid">
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card">
            <Statistic title="Tổng ban đầu" value={totals.initial} formatter={formatMoney} prefix={<WalletOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card">
            <Statistic title="Tổng thu thêm" value={totals.income} formatter={formatMoney} prefix={<LineChartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card">
            <Statistic title="Tổng đã chi" value={totals.expense} formatter={formatMoney} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="summary-card highlight-card">
            <Statistic title="Tổng còn lại" value={totals.remaining} formatter={formatMoney} prefix={<WalletOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card className="toolbar-card">
        <Flex justify="space-between" align="center" gap={16} wrap="wrap">
          <Input
            className="search-input"
            size="large"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm quỹ theo tên hoặc mô tả..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />

          <Space wrap>
            <Popconfirm
              title="Khôi phục dữ liệu mẫu?"
              description="Dữ liệu hiện tại sẽ được thay bằng dữ liệu mẫu."
              okText="Khôi phục"
              cancelText="Hủy"
              onConfirm={handleResetDemoData}
            >
              <Button icon={<ReloadOutlined />}>Dữ liệu mẫu</Button>
            </Popconfirm>
            <Popconfirm
              title="Xóa toàn bộ dữ liệu?"
              description="Thao tác này chỉ xóa dữ liệu localStorage trên thiết bị hiện tại."
              okText="Xóa hết"
              cancelText="Hủy"
              onConfirm={handleClearAll}
            >
              <Button danger icon={<DeleteOutlined />}>
                Xóa hết
              </Button>
            </Popconfirm>
          </Space>
        </Flex>
      </Card>

      {visibleFunds.length === 0 ? (
        <Card className="empty-card">
          <Empty description="Chưa có quỹ nào hoặc không tìm thấy quỹ phù hợp">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateFundModal}>
              Tạo quỹ đầu tiên
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {visibleFunds.map((fund) => {
            const stats = getFundStats(fund);
            return (
              <Col xs={24} md={12} xl={8} xxl={6} key={fund.id}>
                <Card
                  className="fund-card"
                  style={{ '--fund-color': fund.color }}
                  actions={[
                    <Button type="link" onClick={() => openTransactionModal(fund)} key="transaction">
                      Ghi thu/chi
                    </Button>,
                    <Button type="link" onClick={() => setDetailFundId(fund.id)} key="detail">
                      Chi tiết
                    </Button>,
                  ]}
                >
                  <Flex justify="space-between" align="flex-start" gap={12}>
                    <Space align="start">
                      <Avatar className="fund-avatar" style={{ backgroundColor: fund.color }} icon={<WalletOutlined />} />
                      <div>
                        <Title level={4} className="fund-title">
                          {fund.name}
                        </Title>
                        <Text type="secondary" className="fund-description">
                          {fund.description || 'Không có mô tả'}
                        </Text>
                      </div>
                    </Space>

                    <Space size={4}>
                      <Button type="text" icon={<EditOutlined />} onClick={() => openEditFundModal(fund)} />
                      <Popconfirm
                        title="Xóa quỹ này?"
                        description="Tất cả giao dịch trong quỹ cũng sẽ bị xóa."
                        okText="Xóa"
                        cancelText="Hủy"
                        onConfirm={() => handleDeleteFund(fund.id)}
                      >
                        <Button danger type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </Flex>

                  <Divider />

                  <Space direction="vertical" size={10} className="fund-money-block">
                    <Flex justify="space-between">
                      <Text type="secondary">Ban đầu</Text>
                      <Text strong>{formatMoney(fund.initialAmount)}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text type="secondary">Đã chi</Text>
                      <Text type="danger" strong>
                        {formatMoney(stats.expense)}
                      </Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text type="secondary">Còn lại</Text>
                      <Text className={stats.isNegative ? 'negative-money' : 'positive-money'} strong>
                        {formatMoney(stats.remaining)}
                      </Text>
                    </Flex>
                  </Space>

                  <Progress
                    className="fund-progress"
                    percent={stats.spentPercent}
                    status={stats.isNegative ? 'exception' : 'active'}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title={editingFund ? 'Cập nhật quỹ' : 'Tạo quỹ mới'}
        open={fundModalOpen}
        okText={editingFund ? 'Lưu thay đổi' : 'Tạo quỹ'}
        cancelText="Hủy"
        onCancel={() => setFundModalOpen(false)}
        onOk={handleSaveFund}
        destroyOnHidden
      >
        <Form form={fundForm} layout="vertical">
          <Form.Item
            label="Tên quỹ"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên quỹ' }]}
          >
            <Input placeholder="Ví dụ: Quỹ ăn, Quỹ tiền xăng..." />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Ghi chú ngắn về mục đích của quỹ" />
          </Form.Item>

          <Form.Item
            label="Số tiền ban đầu"
            name="initialAmount"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền ban đầu' }]}
          >
            <InputNumber
              min={0}
              step={50000}
              className="full-width"
              addonAfter="VND"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\,/g, '')}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item label="Màu nhận diện" name="color" rules={[{ required: true }]}> 
            <Segmented
              options={FUND_COLORS.map((color) => ({
                label: <span className="color-dot" style={{ backgroundColor: color }} />,
                value: color,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thiết lập tổng tiền"
        open={totalModalOpen}
        okText="Lưu"
        cancelText="Hủy"
        onCancel={() => setTotalModalOpen(false)}
        onOk={async () => {
          const values = await totalForm.validateFields();
          setTotalMoney(Number(values.total || 0));
          setTotalModalOpen(false);
          totalForm.resetFields();
          message.success('Đã lưu tổng tiền');
        }}
        destroyOnHidden
      >
        <Form form={totalForm} layout="vertical">
          <Form.Item
            label="Tổng tiền"
            name="total"
            rules={[{ required: true, message: 'Vui lòng nhập tổng tiền' }]}
          >
            <InputNumber
              min={0}
              step={50000}
              className="full-width"
              addonAfter="VND"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\,/g, '')}
              placeholder="0"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={transactionModalFund ? `Ghi thu/chi - ${transactionModalFund.name}` : 'Ghi thu/chi'}
        open={Boolean(transactionModalFund)}
        okText="Lưu giao dịch"
        cancelText="Hủy"
        onCancel={() => setTransactionModalFund(null)}
        onOk={handleAddTransaction}
        destroyOnHidden
      >
        <Form form={transactionForm} layout="vertical">
          <Form.Item label="Loại giao dịch" name="type" rules={[{ required: true }]}> 
            <Segmented
              block
              options={[
                { label: 'Chi tiền', value: 'expense' },
                { label: 'Thu / nạp thêm', value: 'income' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Số tiền"
            name="amount"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
          >
            <InputNumber
              min={1}
              step={10000}
              className="full-width"
              addonAfter="VND"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\,/g, '')}
              placeholder="Nhập số tiền"
            />
          </Form.Item>

          <Form.Item label="Ngày" name="date" rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}> 
            <DatePicker className="full-width" format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={3} placeholder="Ví dụ: ăn trưa, đổ xăng, mua vé..." />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={detailFund ? `Chi tiết: ${detailFund.name}` : 'Chi tiết quỹ'}
        open={Boolean(detailFund)}
        width={760}
        onClose={() => setDetailFundId(null)}
        extra={
          detailFund ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openTransactionModal(detailFund)}>
              Ghi thu/chi
            </Button>
          ) : null
        }
      >
        {detailFund && detailStats ? (
          <Space direction="vertical" size={18} className="full-width">
            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic title="Ban đầu" value={detailFund.initialAmount} formatter={formatMoney} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic title="Thu thêm" value={detailStats.income} formatter={formatMoney} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic title="Đã chi" value={detailStats.expense} formatter={formatMoney} />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small">
                  <Statistic title="Còn lại" value={detailStats.remaining} formatter={formatMoney} />
                </Card>
              </Col>
            </Row>

            <Card title="Tổng hợp theo ngày" size="small">
              {dailySummary.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có giao dịch" />
              ) : (
                <List
                  dataSource={dailySummary}
                  renderItem={(item) => (
                    <List.Item>
                      <Flex justify="space-between" align="center" className="daily-row" gap={12}>
                        <Text strong>{formatDate(item.date)}</Text>
                        <Space wrap>
                          <Tag color="green">Thu: {formatMoney(item.income)}</Tag>
                          <Tag color="red">Chi: {formatMoney(item.expense)}</Tag>
                          <Tag>Ròng: {formatMoney(item.income - item.expense)}</Tag>
                        </Space>
                      </Flex>
                    </List.Item>
                  )}
                />
              )}
            </Card>

            <Card title="Lịch sử giao dịch" size="small">
              <Table
                rowKey="id"
                columns={transactionColumns}
                dataSource={detailFund.transactions}
                pagination={{ pageSize: 6 }}
                scroll={{ x: 680 }}
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>
    </main>
  );
}

export default App;
