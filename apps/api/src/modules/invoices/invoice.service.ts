import { StatusCodes } from "http-status-codes";
import { invoiceRepository } from "../../repositories/invoice.repository";
import type { InvoiceListItem, ListInvoicesQuery } from "./invoice.types";

type ServiceError = Error & { statusCode?: number };

const buildServiceError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

export class InvoiceService {
  async listUserInvoices(userId: string, query: ListInvoicesQuery): Promise<{
    items: InvoiceListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await invoiceRepository.listByUser(userId, query);
    return {
      items: data.map((invoice) => this.toItem(invoice)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async listAllInvoices(query: ListInvoicesQuery): Promise<{
    items: InvoiceListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { data, total } = await invoiceRepository.listAll(query);
    return {
      items: data.map((invoice) => this.toItem(invoice)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  }

  async getInvoiceById(invoiceId: string) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw buildServiceError("Invoice not found", StatusCodes.NOT_FOUND);
    }
    return this.toItem(invoice);
  }

  private toItem(invoice: Awaited<ReturnType<typeof invoiceRepository.findById>>): InvoiceListItem {
    if (!invoice) {
      throw buildServiceError("Invoice not found", StatusCodes.NOT_FOUND);
    }

    return {
      id: invoice.id,
      type: invoice.type as InvoiceListItem["type"],
      status: invoice.status as InvoiceListItem["status"],
      amount: invoice.amount,
      currency: invoice.currency,
      provider: invoice.provider as InvoiceListItem["provider"],
      providerOrderId: invoice.providerOrderId ?? undefined,
      providerPaymentId: invoice.providerPaymentId ?? undefined,
      referenceId: invoice.referenceId ?? undefined,
      createdAt: invoice.createdAt,
      paidAt: invoice.paidAt ?? undefined
    };
  }
}

export const invoiceService = new InvoiceService();
