import { useEffect, useState } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { createCompany, updateCompany } from "@/services/companies";
import type { Company } from "@/types/company";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess: () => void;
}

interface CompanyForm {
  name: string;
  legal_name: string;
  tax_id: string;
  vat_number: string;
  registration_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  zip_code: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  currency: string;
  pos_stock_deduction: string;
  sale_stock_deduction: string;
  discount_pin_threshold: number;
  sale_validation_threshold: number;
  notes: string;
}

const defaultForm: CompanyForm = {
  name: "",
  legal_name: "",
  tax_id: "",
  vat_number: "",
  registration_number: "",
  address_line1: "",
  address_line2: "",
  city: "",
  zip_code: "",
  country: "",
  email: "",
  phone: "",
  website: "",
  currency: "EUR",
  pos_stock_deduction: "on_payment",
  sale_stock_deduction: "on_delivery",
  discount_pin_threshold: 0,
  sale_validation_threshold: 0,
  notes: "",
};

function companyToForm(company: Company): CompanyForm {
  return {
    name: company.name,
    legal_name: company.legal_name ?? "",
    tax_id: company.tax_id ?? "",
    vat_number: company.vat_number ?? "",
    registration_number: company.registration_number ?? "",
    address_line1: company.address_line1 ?? "",
    address_line2: company.address_line2 ?? "",
    city: company.city ?? "",
    zip_code: company.zip_code ?? "",
    country: company.country ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    website: company.website ?? "",
    currency: company.currency,
    pos_stock_deduction: company.pos_stock_deduction,
    sale_stock_deduction: company.sale_stock_deduction,
    discount_pin_threshold: company.discount_pin_threshold,
    sale_validation_threshold: company.sale_validation_threshold,
    notes: company.notes ?? "",
  };
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
}: CompanyFormDialogProps) {
  const [form, setForm] = useState<CompanyForm>(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(company ? companyToForm(company) : defaultForm);
    }
  }, [open, company]);

  const updateField = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (company) {
        await updateCompany(company.id, form);
      } else {
        await createCompany(form);
      }
      toast({ title: "Societe enregistree" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={company ? "Modifier la societe" : "Nouvelle societe"}
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="sm:max-w-[700px]"
    >
      <div className="space-y-6">
        {/* Section: Informations generales */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Informations generales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Raison sociale</Label>
              <Input
                id="legal_name"
                value={form.legal_name}
                onChange={(e) => updateField("legal_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">SIRET/SIREN</Label>
              <Input
                id="tax_id"
                value={form.tax_id}
                onChange={(e) => updateField("tax_id", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">N° TVA</Label>
              <Input
                id="vat_number"
                value={form.vat_number}
                onChange={(e) => updateField("vat_number", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_number">RCS</Label>
              <Input
                id="registration_number"
                value={form.registration_number}
                onChange={(e) => updateField("registration_number", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section: Adresse */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Adresse
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Adresse</Label>
              <Input
                id="address_line1"
                value={form.address_line1}
                onChange={(e) => updateField("address_line1", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2">Complement</Label>
              <Input
                id="address_line2"
                value={form.address_line2}
                onChange={(e) => updateField("address_line2", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">Code postal</Label>
              <Input
                id="zip_code"
                value={form.zip_code}
                onChange={(e) => updateField("zip_code", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section: Contact */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telephone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section: Parametres */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Parametres
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select
                value={form.currency}
                onValueChange={(value) => updateField("currency", value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="XOF">XOF</SelectItem>
                  <SelectItem value="XAF">XAF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos_stock_deduction">Deduction stock POS</Label>
              <Select
                value={form.pos_stock_deduction}
                onValueChange={(value) => updateField("pos_stock_deduction", value)}
              >
                <SelectTrigger id="pos_stock_deduction">
                  <SelectValue placeholder="Deduction stock POS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_payment">Au paiement</SelectItem>
                  <SelectItem value="on_order">A la commande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_stock_deduction">Deduction stock vente</Label>
              <Select
                value={form.sale_stock_deduction}
                onValueChange={(value) => updateField("sale_stock_deduction", value)}
              >
                <SelectTrigger id="sale_stock_deduction">
                  <SelectValue placeholder="Deduction stock vente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_delivery">A la livraison</SelectItem>
                  <SelectItem value="on_order">A la commande</SelectItem>
                  <SelectItem value="on_invoice">A la facturation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_pin_threshold">Seuil PIN remise (%)</Label>
              <Input
                id="discount_pin_threshold"
                type="number"
                value={form.discount_pin_threshold}
                onChange={(e) =>
                  updateField("discount_pin_threshold", Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_validation_threshold">
                Seuil validation vente ({form.currency})
              </Label>
              <Input
                id="sale_validation_threshold"
                type="number"
                value={form.sale_validation_threshold}
                onChange={(e) =>
                  updateField("sale_validation_threshold", Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
