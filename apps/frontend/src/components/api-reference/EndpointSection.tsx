import type {
  Endpoint,
  EndpointGroup,
  HttpMethod,
  Param,
} from "./apiReferenceData";

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold tracking-wide ${METHOD_STYLES[method]}`}
    >
      {method}
    </span>
  );
}

function ParamTable({ title, params }: { title: string; params: Param[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {title}
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-3 py-1.5 font-medium">Name</th>
              <th className="px-3 py-1.5 font-medium">Type</th>
              <th className="px-3 py-1.5 font-medium hidden sm:table-cell">
                Required
              </th>
              <th className="px-3 py-1.5 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name} className="border-t border-gray-100">
                <td className="px-3 py-1.5 font-mono text-xs text-gray-900">
                  {p.name}
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-500">
                  {p.type}
                </td>
                <td className="px-3 py-1.5 hidden sm:table-cell">
                  {p.required ? (
                    <span className="text-xs text-red-600 font-medium">
                      required
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">optional</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-600">
                  {p.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 flex-wrap">
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-semibold text-gray-800">
          {endpoint.path}
        </code>
        <span className="ml-auto text-xs text-gray-400 font-mono">
          {endpoint.scope}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{endpoint.description}</p>
      {endpoint.queryParams && (
        <ParamTable title="Query Parameters" params={endpoint.queryParams} />
      )}
      {endpoint.requestBody && (
        <ParamTable title="Request Body (JSON)" params={endpoint.requestBody} />
      )}
    </div>
  );
}

export function EndpointSection({ group }: { group: EndpointGroup }) {
  return (
    <section id={group.id} className="scroll-mt-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{group.title}</h2>
      <p className="text-sm text-gray-500 mb-4">{group.description}</p>
      <div className="space-y-4">
        {group.endpoints.map((ep) => (
          <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
        ))}
      </div>
    </section>
  );
}
