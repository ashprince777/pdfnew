import {
    PDFCheckBox,
    PDFDropdown,
    PDFHexString,
    PDFName,
    PDFString,
    PDFOptionList,
    PDFRadioGroup,
    PDFTextField,
    type PDFDocument,
    type PDFField,
} from '@cantoo/pdf-lib';
import { embedUnicodeFont, loadPdf } from './pdf';

export type FormFieldInfo =
    | { kind: 'text'; name: string; label: string; page: number; readOnly: boolean; value: string; multiline: boolean; maxLength?: number }
    | { kind: 'checkbox'; name: string; label: string; page: number; readOnly: boolean; value: boolean }
    | { kind: 'radio' | 'dropdown'; name: string; label: string; page: number; readOnly: boolean; value: string; options: string[] }
    | { kind: 'list'; name: string; label: string; page: number; readOnly: boolean; value: string[]; options: string[]; multiple: boolean };

export type FormValues = Record<string, string | boolean | string[]>;

/** The field's tooltip when it has one, otherwise its name made readable: "customer.full_name" -> "Full name". */
function labelFor(field: PDFField): string {
    const tooltip = field.acroField.dict.lookupMaybe(PDFName.of('TU'), PDFString, PDFHexString)?.decodeText().trim();
    if (tooltip) return tooltip;
    const last = field.getName().split('.').pop() || field.getName();
    const words = last.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_\-]+/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function pageOf(doc: PDFDocument, field: PDFField): number {
    const pages = doc.getPages();
    for (const widget of field.acroField.getWidgets()) {
        const ref = widget.P();
        const index = ref ? pages.findIndex((p) => p.ref === ref) : -1;
        if (index >= 0) return index + 1;
        const byAnnots = pages.findIndex((p) => p.node.Annots()?.asArray().some((a) => doc.context.lookup(a) === widget.dict));
        if (byAnnots >= 0) return byAnnots + 1;
    }
    return 1;
}

/** Lists the fillable fields of a PDF in page order. Signature and push-button fields are skipped. */
export async function readFormFields(file: File): Promise<FormFieldInfo[]> {
    const doc = await loadPdf(file);
    if (!doc.catalog.has(PDFName.of('AcroForm'))) return [];
    const fields: FormFieldInfo[] = [];
    for (const field of doc.getForm().getFields()) {
        const common = { name: field.getName(), label: labelFor(field), page: pageOf(doc, field), readOnly: field.isReadOnly() };
        if (field instanceof PDFTextField) {
            fields.push({ ...common, kind: 'text', value: field.getText() ?? '', multiline: field.isMultiline(), maxLength: field.getMaxLength() });
        } else if (field instanceof PDFCheckBox) {
            fields.push({ ...common, kind: 'checkbox', value: field.isChecked() });
        } else if (field instanceof PDFRadioGroup) {
            fields.push({ ...common, kind: 'radio', value: field.getSelected() ?? '', options: field.getOptions() });
        } else if (field instanceof PDFDropdown) {
            fields.push({ ...common, kind: 'dropdown', value: field.getSelected()[0] ?? '', options: field.getOptions() });
        } else if (field instanceof PDFOptionList) {
            fields.push({ ...common, kind: 'list', value: field.getSelected(), options: field.getOptions(), multiple: field.isMultiselect() });
        }
    }
    return fields.sort((a, b) => a.page - b.page);
}

/** True when Helvetica (WinAnsi) cannot show the text, e.g. ₹, Hindi or Greek. */
function needsUnicodeFont(values: FormValues): boolean {
    return Object.values(values).some((value) => {
        const texts = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
        return texts.some((text) => /[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/.test(text));
    });
}

/** Writes the values into the form. With `flatten`, the fields become ordinary page content. */
export async function fillForm(file: File, values: FormValues, flatten: boolean): Promise<Uint8Array> {
    const doc = await loadPdf(file);
    const form = doc.getForm();
    for (const [name, value] of Object.entries(values)) {
        const field = form.getFieldMaybe(name);
        if (!field || field.isReadOnly()) continue;
        if (field instanceof PDFTextField && typeof value === 'string') {
            field.setText(value || undefined);
        } else if (field instanceof PDFCheckBox) {
            if (value === true) field.check();
            else field.uncheck();
        } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
            if (value) field.select(value);
            else field.clear();
        } else if (field instanceof PDFDropdown && typeof value === 'string') {
            if (value) field.select(value);
            else field.clear();
        } else if (field instanceof PDFOptionList && Array.isArray(value)) {
            if (value.length) field.select(value);
            else field.clear();
        }
    }
    // Standard fonts only cover Western European text; embed Noto Sans for anything else.
    if (needsUnicodeFont(values)) form.updateFieldAppearances(await embedUnicodeFont(doc));
    else form.updateFieldAppearances();
    if (flatten) form.flatten({ updateFieldAppearances: false });
    return doc.save({ updateFieldAppearances: false });
}
