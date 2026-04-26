/**
 * Table - Generic data table component
 *
 * RESPONSIBILITY:
 * - Render table with columns and rows
 * - Handle row selection (optional)
 * - Emit row action events
 */

import BaseComponent from '../../../base/BaseComponent.js';

class Table extends BaseComponent {
    constructor(container, props = {}) {
        super(container, props);
        this.selectedRows = new Set();
    }

    /**
     * Render table
     */
    render() {
        const {
            columns = [],
            rows = [],
            selectable = false,
            onRowClick = null
        } = this.props;

        if (rows.length === 0) {
            return '<div class="table-empty"><p>No data available</p></div>';
        }

        const headerRow = columns.map(col => `<th>${this.escapeHtml(col.label)}</th>`).join('');
        const bodyRows = rows.map((row, idx) => {
            const cells = columns.map(col => {
                const value = row[col.key];
                return `<td>${this.escapeHtml(String(value || ''))}</td>`;
            }).join('');

            return `
                <tr class="table-row" data-row-index="${idx}">
                    ${selectable ? `<td class="table-checkbox"><input type="checkbox" data-row-index="${idx}"></td>` : ''}
                    ${cells}
                </tr>
            `;
        }).join('');

        return `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${selectable ? '<th class="table-checkbox-header"><input type="checkbox" class="select-all"></th>' : ''}
                            ${headerRow}
                        </tr>
                    </thead>
                    <tbody>
                        ${bodyRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.props.selectable) {
            const selectAllCheckbox = this.querySelector('.select-all');
            const rowCheckboxes = this.querySelectorAll('[data-row-index] input[type="checkbox"]');

            if (selectAllCheckbox) {
                this.attachListener(selectAllCheckbox, 'change', (e) => {
                    rowCheckboxes.forEach(cb => {
                        cb.checked = e.target.checked;
                        const idx = cb.dataset.rowIndex;
                        if (e.target.checked) {
                            this.selectedRows.add(idx);
                        } else {
                            this.selectedRows.delete(idx);
                        }
                    });
                    this.emit('selectionChange', {selectedRows: Array.from(this.selectedRows)});
                });
            }

            rowCheckboxes.forEach(checkbox => {
                this.attachListener(checkbox, 'change', (e) => {
                    const idx = e.target.dataset.rowIndex;
                    if (e.target.checked) {
                        this.selectedRows.add(idx);
                    } else {
                        this.selectedRows.delete(idx);
                    }
                    this.emit('selectionChange', {selectedRows: Array.from(this.selectedRows)});
                });
            });
        }

        const rows = this.querySelectorAll('.table-row');
        rows.forEach((row, idx) => {
            this.attachListener(row, 'click', () => {
                this.emit('rowClick', {rowIndex: idx, row: this.props.rows[idx]});
            });
        });
    }

    /**
     * Get selected rows
     */
    getSelectedRows() {
        return Array.from(this.selectedRows).map(idx => this.props.rows[idx]);
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedRows.clear();
        const checkboxes = this.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
    }
}

export default Table;
