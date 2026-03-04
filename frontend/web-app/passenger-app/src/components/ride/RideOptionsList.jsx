import RideOptionCard from './RideOptionCard';

export default function RideOptionsList({ options, selectedType, onSelect, onViewBreakdown }) {
    if (!options || options.length === 0) return null;

    return (
        <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                CÁC LOẠI XE
            </p>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
                {options.map((option) => (
                    <RideOptionCard
                        key={option.vehicleType}
                        data={option}
                        selected={selectedType === option.vehicleType}
                        onSelect={onSelect}
                        onViewBreakdown={onViewBreakdown}
                    />
                ))}
            </div>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
