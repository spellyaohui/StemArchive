/**
 * 数据表格组件
 * 提供分页、排序、搜索等功能的数据表格
 */

class DataTable extends BaseComponent {
  constructor(container, options = {}) {
    const defaultOptions = {
      className: 'data-table',
      columns: [],
      data: [],
      pageSize: 10,
      showSearch: true,
      showPagination: true,
      showActions: true,
      sortable: true,
      filterable: true,
      emptyMessage: '暂无数据',
      loadingMessage: '加载中...',
      ...options
    };

    super(container, defaultOptions);

    this.currentPage = 1;
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.searchTerm = '';
    this.filters = {};
    this.isLoading = false;
  }

  getTemplate() {
    return `
            <div class="data-table-container">
                ${this.options.showSearch ? this.getSearchTemplate() : ''}
                ${this.options.filterable ? this.getFilterTemplate() : ''}
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                ${this.options.columns.map(col => this.getHeaderTemplate(col)).join('')}
                                ${this.options.showActions ? '<th class="actions-column">操作</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getTableBodyTemplate()}
                        </tbody>
                    </table>
                </div>
                ${this.options.showPagination ? this.getPaginationTemplate() : ''}
            </div>
        `;
  }

  getSearchTemplate() {
    return `
            <div class="table-search">
                <div class="search-input-group">
                    <i class="fas fa-search search-icon"></i>
                    <input
                        type="text"
                        class="search-input"
                        placeholder="搜索..."
                        value="${this.searchTerm}"
                    />
                    <button class="search-clear-btn ${this.searchTerm ? '' : 'hidden'}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
  }

  getFilterTemplate() {
    return `
            <div class="table-filters">
                ${this.options.columns
    .filter(col => col.filterable)
    .map(col => this.getFilterColumnTemplate(col))
    .join('')}
            </div>
        `;
  }

  getFilterColumnTemplate(column) {
    const filterValue = this.filters[column.key] || '';

    switch (column.filterType) {
    case 'select':
      return `
                    <div class="filter-item">
                        <label>${column.title}</label>
                        <select class="filter-select" data-column="${column.key}">
                            <option value="">全部</option>
                            ${column.filterOptions.map(opt =>
    `<option value="${opt.value}" ${opt.value === filterValue ? 'selected' : ''}>${opt.label}</option>`
  ).join('')}
                        </select>
                    </div>
                `;
    case 'date':
      return `
                    <div class="filter-item">
                        <label>${column.title}</label>
                        <input
                            type="date"
                            class="filter-date"
                            data-column="${column.key}"
                            value="${filterValue}"
                        />
                    </div>
                `;
    case 'range':
      return `
                    <div class="filter-item">
                        <label>${column.title}</label>
                        <div class="range-inputs">
                            <input
                                type="number"
                                class="filter-range-min"
                                data-column="${column.key}"
                                placeholder="最小值"
                            />
                            <span>-</span>
                            <input
                                type="number"
                                class="filter-range-max"
                                data-column="${column.key}"
                                placeholder="最大值"
                            />
                        </div>
                    </div>
                `;
    default:
      return `
                    <div class="filter-item">
                        <label>${column.title}</label>
                        <input
                            type="text"
                            class="filter-text"
                            data-column="${column.key}"
                            value="${filterValue}"
                        />
                    </div>
                `;
    }
  }

  getHeaderTemplate(column) {
    const sortable = column.sortable && this.options.sortable;
    const sortClass = this.sortColumn === column.key ? `sorted-${this.sortDirection}` : '';
    const sortIcon = this.sortColumn === column.key ?
      `<i class="fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'}"></i>` :
      '<i class="fas fa-sort"></i>';

    return `
            <th class="column-${column.key} ${sortClass}" data-key="${column.key}">
                <div class="header-content">
                    <span class="column-title">${column.title}</span>
                    ${sortable ? `<span class="sort-icon">${sortIcon}</span>` : ''}
                </div>
            </th>
        `;
  }

  getTableBodyTemplate() {
    if (this.isLoading) {
      return `
                <tr>
                    <td colspan="${this.options.columns.length + (this.options.showActions ? 1 : 0)}" class="loading-cell">
                        <div class="loading-content">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>${this.options.loadingMessage}</span>
                        </div>
                    </td>
                </tr>
            `;
    }

    const displayData = this.getDisplayData();

    if (displayData.length === 0) {
      return `
                <tr>
                    <td colspan="${this.options.columns.length + (this.options.showActions ? 1 : 0)}" class="empty-cell">
                        <div class="empty-content">
                            <i class="fas fa-inbox"></i>
                            <span>${this.options.emptyMessage}</span>
                        </div>
                    </td>
                </tr>
            `;
    }

    return displayData.map(row => this.getRowTemplate(row)).join('');
  }

  getRowTemplate(row) {
    return `
            <tr class="data-row" data-id="${row.id}">
                ${this.options.columns.map(col => this.getCellTemplate(col, row)).join('')}
                ${this.options.showActions ? this.getActionsTemplate(row) : ''}
            </tr>
        `;
  }

  getCellTemplate(column, row) {
    const value = this.getCellValue(column, row);
    const cellClass = column.className || '';

    switch (column.type) {
    case 'status':
      return `
                    <td class="cell-status ${cellClass}">
                        <span class="status-badge status-${value}">${this.getStatusText(value, column)}</span>
                    </td>
                `;
    case 'date':
      return `
                    <td class="cell-date ${cellClass}">
                        ${this.formatDate(value, column.dateFormat)}
                    </td>
                `;
    case 'number':
      return `
                    <td class="cell-number ${cellClass}">
                        ${this.formatNumber(value, column)}
                    </td>
                `;
    case 'image':
      return `
                    <td class="cell-image ${cellClass}">
                        ${value ? `<img src="${value}" alt="${column.alt || ''}" class="table-image" />` : '-'}
                    </td>
                `;
    case 'link':
      return `
                    <td class="cell-link ${cellClass}">
                        ${value ? `<a href="${value}" target="_blank" class="table-link">${column.linkText || value}</a>` : '-'}
                    </td>
                `;
    case 'custom':
      return `
                    <td class="cell-custom ${cellClass}">
                        ${column.render ? column.render(value, row) : value}
                    </td>
                `;
    default:
      return `
                    <td class="cell-text ${cellClass}">
                        ${value || '-'}
                    </td>
                `;
    }
  }

  getActionsTemplate(row) {
    return `
            <td class="actions-column">
                <div class="table-actions">
                    ${this.getActionButtons(row).map(btn => this.getActionButtonTemplate(btn, row)).join('')}
                </div>
            </td>
        `;
  }

  getActionButtonTemplate(button, row) {
    const disabled = button.disabled ? button.disabled(row) : false;
    const hidden = button.hidden ? button.hidden(row) : false;

    if (hidden) {return '';}

    return `
            <button
                class="action-btn ${button.className || ''} ${disabled ? 'disabled' : ''}"
                data-action="${button.action}"
                data-id="${row.id}"
                ${disabled ? 'disabled' : ''}
                title="${button.title || ''}"
            >
                <i class="fas fa-${button.icon}"></i>
                ${button.text ? `<span>${button.text}</span>` : ''}
            </button>
        `;
  }

  getPaginationTemplate() {
    const totalItems = this.getTotalItems();
    const totalPages = Math.ceil(totalItems / this.options.pageSize);
    const startItem = (this.currentPage - 1) * this.options.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.options.pageSize, totalItems);

    return `
            <div class="table-pagination">
                <div class="pagination-info">
                    显示 ${startItem} 到 ${endItem} 条，共 ${totalItems} 条记录
                </div>
                <div class="pagination-controls">
                    <button class="pagination-btn first-page" ${this.currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-angle-double-left"></i>
                    </button>
                    <button class="pagination-btn prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-angle-left"></i>
                    </button>
                    <div class="pagination-pages">
                        ${this.getPageNumbers(totalPages).map(page =>
    `<button class="pagination-page ${page === this.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`
  ).join('')}
                    </div>
                    <button class="pagination-btn next-page" ${this.currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-angle-right"></i>
                    </button>
                    <button class="pagination-btn last-page" ${this.currentPage === totalPages ? 'disabled' : ''}>
                        <i class="fas fa-angle-double-right"></i>
                    </button>
                </div>
                <div class="pagination-size">
                    <select class="page-size-select">
                        <option value="10" ${this.options.pageSize === 10 ? 'selected' : ''}>10条/页</option>
                        <option value="20" ${this.options.pageSize === 20 ? 'selected' : ''}>20条/页</option>
                        <option value="50" ${this.options.pageSize === 50 ? 'selected' : ''}>50条/页</option>
                        <option value="100" ${this.options.pageSize === 100 ? 'selected' : ''}>100条/页</option>
                    </select>
                </div>
            </div>
        `;
  }

  getDisplayData() {
    let data = this.options.data;

    // 应用搜索过滤
    if (this.searchTerm) {
      data = data.filter(row => this.matchesSearch(row, this.searchTerm));
    }

    // 应用列过滤
    Object.keys(this.filters).forEach(column => {
      const filterValue = this.filters[column];
      if (filterValue) {
        data = data.filter(row => this.matchesFilter(row, column, filterValue));
      }
    });

    // 应用排序
    if (this.sortColumn) {
      data = this.sortData(data, this.sortColumn, this.sortDirection);
    }

    // 应用分页
    const startIndex = (this.currentPage - 1) * this.options.pageSize;
    return data.slice(startIndex, startIndex + this.options.pageSize);
  }

  getTotalItems() {
    let data = this.options.data;

    // 应用搜索过滤
    if (this.searchTerm) {
      data = data.filter(row => this.matchesSearch(row, this.searchTerm));
    }

    // 应用列过滤
    Object.keys(this.filters).forEach(column => {
      const filterValue = this.filters[column];
      if (filterValue) {
        data = data.filter(row => this.matchesFilter(row, column, filterValue));
      }
    });

    return data.length;
  }

  matchesSearch(row, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    return this.options.columns.some(col => {
      const value = this.getCellValue(col, row);
      return value && value.toString().toLowerCase().includes(searchLower);
    });
  }

  matchesFilter(row, column, filterValue) {
    const columnConfig = this.options.columns.find(col => col.key === column);
    if (!columnConfig) {return true;}

    const value = row[column];

    switch (columnConfig.filterType) {
    case 'select':
      return value === filterValue;
    case 'date':
      return value === filterValue;
    case 'range':
      const [min, max] = filterValue;
      if (min !== undefined && value < min) {return false;}
      if (max !== undefined && value > max) {return false;}
      return true;
    default:
      return value && value.toString().toLowerCase().includes(filterValue.toLowerCase());
    }
  }

  sortData(data, column, direction) {
    const columnConfig = this.options.columns.find(col => col.key === column);
    if (!columnConfig) {return data;}

    return data.sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];

      // 处理排序转换
      if (columnConfig.sortValue) {
        aValue = columnConfig.sortValue(aValue, a);
        bValue = columnConfig.sortValue(bValue, b);
      }

      // 处理数据类型
      if (columnConfig.type === 'number') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (columnConfig.type === 'date') {
        aValue = new Date(aValue) || new Date(0);
        bValue = new Date(bValue) || new Date(0);
      } else {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      }

      let result = 0;
      if (aValue < bValue) {result = -1;}
      if (aValue > bValue) {result = 1;}

      return direction === 'asc' ? result : -result;
    });
  }

  getCellValue(column, row) {
    if (column.render) {
      return column.render(row[column], row);
    }
    return row[column.key];
  }

  getActionButtons(row) {
    if (typeof this.options.actions === 'function') {
      return this.options.actions(row);
    }
    return this.options.actions || [];
  }

  getStatusText(value, column) {
    if (column.statusMap && column.statusMap[value]) {
      return column.statusMap[value];
    }
    return value;
  }

  formatDate(value, format = 'YYYY-MM-DD') {
    if (!value) {return '';}
    const date = new Date(value);
    if (isNaN(date.getTime())) {return '';}

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  }

  formatNumber(value, column) {
    if (value === null || value === undefined) {return '';}

    const num = parseFloat(value);
    if (isNaN(num)) {return value;}

    const decimals = column.decimals || 2;
    const suffix = column.suffix || '';
    const prefix = column.prefix || '';

    return `${prefix}${num.toFixed(decimals)}${suffix}`;
  }

  getPageNumbers(totalPages) {
    const pages = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, this.currentPage - half);
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  bindEvents() {
    // 搜索事件
    this.addEventListener('.search-input', 'input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this.updateClearButton();
      this.render();
    });

    this.addEventListener('.search-clear-btn', 'click', () => {
      this.clearSearch();
    });

    // 排序事件
    this.addEventListener('th[data-key]', 'click', (e) => {
      const column = e.currentTarget.dataset.key;
      const columnConfig = this.options.columns.find(col => col.key === column);

      if (columnConfig && columnConfig.sortable && this.options.sortable) {
        if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          this.sortDirection = 'asc';
        }
        this.currentPage = 1;
        this.render();
      }
    });

    // 分页事件
    this.addEventListener('.pagination-page', 'click', (e) => {
      const page = parseInt(e.target.dataset.page);
      if (page !== this.currentPage) {
        this.currentPage = page;
        this.render();
      }
    });

    this.addEventListener('.first-page', 'click', () => {
      if (this.currentPage > 1) {
        this.currentPage = 1;
        this.render();
      }
    });

    this.addEventListener('.prev-page', 'click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
      }
    });

    this.addEventListener('.next-page', 'click', () => {
      const totalPages = Math.ceil(this.getTotalItems() / this.options.pageSize);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.render();
      }
    });

    this.addEventListener('.last-page', 'click', () => {
      const totalPages = Math.ceil(this.getTotalItems() / this.options.pageSize);
      if (this.currentPage < totalPages) {
        this.currentPage = totalPages;
        this.render();
      }
    });

    this.addEventListener('.page-size-select', 'change', (e) => {
      this.options.pageSize = parseInt(e.target.value);
      this.currentPage = 1;
      this.render();
    });

    // 过滤事件
    this.addEventListener('.filter-select', 'change', (e) => {
      const column = e.target.dataset.column;
      const value = e.target.value;
      this.updateFilter(column, value);
    });

    this.addEventListener('.filter-text', 'input', (e) => {
      const column = e.target.dataset.column;
      const value = e.target.value;
      this.updateFilter(column, value);
    });

    this.addEventListener('.filter-date', 'change', (e) => {
      const column = e.target.dataset.column;
      const value = e.target.value;
      this.updateFilter(column, value);
    });

    // 操作按钮事件
    this.addEventListener('.action-btn', 'click', (e) => {
      const button = e.currentTarget;
      const action = button.dataset.action;
      const id = button.dataset.id;
      const row = this.options.data.find(item => item.id === id);

      if (this.options.onAction) {
        this.options.onAction(action, row, button);
      }
    });
  }

  updateClearButton() {
    const clearBtn = this.container?.querySelector('.search-clear-btn');
    if (clearBtn) {
      if (this.searchTerm) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
  }

  updateFilter(column, value) {
    if (value) {
      this.filters[column] = value;
    } else {
      delete this.filters[column];
    }
    this.currentPage = 1;
    this.render();
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentPage = 1;
    this.updateClearButton();
    this.render();
  }

  clearFilters() {
    this.filters = {};
    this.currentPage = 1;
    this.render();
  }

  // 公共方法
  setData(data) {
    this.options.data = data;
    this.currentPage = 1;
    this.render();
  }

  addData(newData) {
    this.options.data = [...this.options.data, ...newData];
    this.render();
  }

  updateData(id, updates) {
    const index = this.options.data.findIndex(item => item.id === id);
    if (index !== -1) {
      this.options.data[index] = { ...this.options.data[index], ...updates };
      this.render();
    }
  }

  removeData(id) {
    this.options.data = this.options.data.filter(item => item.id !== id);
    this.render();
  }

  refresh() {
    if (this.options.onRefresh) {
      this.isLoading = true;
      this.render();
      this.options.onRefresh().finally(() => {
        this.isLoading = false;
        this.render();
      });
    }
  }

  exportData(format = 'csv') {
    if (this.options.onExport) {
      this.options.onExport(format, this.getDisplayData());
    }
  }
}

// 导出数据表格组件
window.DataTable = DataTable;