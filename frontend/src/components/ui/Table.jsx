export function Table({ className = '', children, ...props }) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className = '', children, ...props }) {
  return (
    <thead className={`[&_tr]:border-b ${className}`.trim()} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = '', children, ...props }) {
  return (
    <tbody className={`[&_tr:last-child]:border-0 ${className}`.trim()} {...props}>
      {children}
    </tbody>
  );
}

export function TableFooter({ className = '', children, ...props }) {
  return (
    <tfoot className={`border-t bg-gray-50 font-medium [&>tr]:last:border-b-0 ${className}`.trim()} {...props}>
      {children}
    </tfoot>
  );
}

export function TableRow({ className = '', children, ...props }) {
  return (
    <tr
      className={`border-b border-gray-200 transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 ${className}`.trim()}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className = '', children, ...props }) {
  return (
    <th
      className={`h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0 ${className}`.trim()}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className = '', children, ...props }) {
  return (
    <td
      className={`px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0 ${className}`.trim()}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableCaption({ className = '', children, ...props }) {
  return (
    <caption className={`mt-4 text-sm text-gray-500 ${className}`.trim()} {...props}>
      {children}
    </caption>
  );
}
